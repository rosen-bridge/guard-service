import {
  binToHex,
  decodeTransactionBCH,
  encodeTransactionBCH,
  hashTransaction,
  hexToBin,
  lockingBytecodeToCashAddress,
  secp256k1,
} from '@bitauth/libauth';
import { describe, expect, it, vi } from 'vitest';

import { encodeAddress } from '@rosen-bridge/address-codec';
import { TokenMap } from '@rosen-bridge/tokens';
import {
  ConfirmationStatus,
  EcdsaSignMediator,
  GET_BOX_API_LIMIT,
  PaymentOrder,
  SigningStatus,
  TransactionType,
} from '@rosen-chains/abstract-chain';

import BitcoinCashChain from '../lib/bitcoinCashChain';
import BitcoinCashTransaction from '../lib/bitcoinCashTransaction';
import {
  decodeBchTransaction,
  getBchOutpointId,
  getBchSigningDigest,
} from '../lib/bitcoinCashUtils';
import { BitcoinCashConfigs, BitcoinCashUtxo } from '../lib/chainTypes';
import AbstractBitcoinCashNetwork from '../lib/network/abstractBitcoinCashNetwork';
import { publicKey, treasuryScript } from './bitcoinCashTestData';
import { privateKey } from './bitcoinCashTestUtils';

/**
 * Encode a fixture locking script as a native mainnet CashAddr.
 * @param script - Canonical hexadecimal locking bytecode
 * @returns The encoded address, rejecting unsupported fixture scripts
 */
const cashAddress = (script: string): string => {
  const result = lockingBytecodeToCashAddress({ bytecode: hexToBin(script) });
  if (typeof result === 'string') throw Error(result);
  return result.address;
};
const destination = cashAddress('76a914' + '12'.repeat(20) + '88ac');
const treasury = cashAddress(treasuryScript);
/** Encode a complete native deposit for admission tests, without claiming script validity. */
const boundedDeposit = (
  inputCount: number,
  outputCount: number,
  byteLength?: number,
) => {
  const destinationScript = encodeAddress(
    'ergo',
    '9iMjQx8PzwBKXRvsFUJFJAPoy31znfEeBUGz8DRkcnJX4rJYjVd',
  );
  const payload = `0000000000000001230000000000000456${(destinationScript.length / 2).toString(16).padStart(2, '0')}${destinationScript}`;
  const outputs = [
    { lockingBytecode: hexToBin(treasuryScript), valueSatoshis: 123456789n },
    {
      lockingBytecode: hexToBin(
        `6a${(payload.length / 2).toString(16)}${payload}`,
      ),
      valueSatoshis: 0n,
    },
    ...Array.from({ length: outputCount - 2 }, () => ({
      lockingBytecode: hexToBin(`76a914${'02'.repeat(20)}88ac`),
      valueSatoshis: 546n,
    })),
  ];
  const inputs = Array.from({ length: inputCount }, (_, index) => ({
    outpointTransactionHash: Uint8Array.from(
      { length: 32 },
      (_, byte) => byte + 1,
    ),
    outpointIndex: index + 7,
    sequenceNumber: 0xffffffff,
    unlockingBytecode: new Uint8Array(byteLength === undefined ? 1 : 256),
  }));
  const transaction = { version: 2, locktime: 0, inputs, outputs };
  if (byteLength !== undefined) {
    const padding = byteLength - encodeTransactionBCH(transaction).length;
    if (padding < 0) throw Error('Fixture byte target is too small');
    inputs.forEach((input, index) => {
      input.unlockingBytecode = new Uint8Array(
        256 +
          Math.floor(padding / inputCount) +
          (index < padding % inputCount ? 1 : 0),
      );
      if (input.unlockingBytecode.length > 10_000)
        throw Error('Fixture input script exceeds its isolated script bound');
    });
  }
  const bytes = encodeTransactionBCH(transaction);
  return {
    hex: binToHex(bytes),
    txid: hashTransaction(bytes),
    vin: inputs.map((input) => ({
      txid: binToHex(input.outpointTransactionHash),
      vout: input.outpointIndex,
    })),
    vout: outputs.map((output, n) => ({
      n,
      value: `${output.valueSatoshis / 100000000n}.${(output.valueSatoshis % 100000000n).toString().padStart(8, '0')}`,
      scriptPubKey: { hex: binToHex(output.lockingBytecode) },
    })),
  };
};
/**
 * Build fresh valid bounded configuration for the synthetic treasury key.
 * @returns One-satoshi fee-rate policy, exact native thresholds and treasury addresses
 */
const config = (): BitcoinCashConfigs => ({
  aggregatedPublicKey: publicKey,
  feeRate: 1,
  maxFee: 100_000n,
  minimumUtxoValue: 546n,
  maxUtxoPages: 2,
  fee: 1n,
  confirmations: {
    observation: 1,
    payment: 1,
    cold: 1,
    manual: 1,
    arbitrary: 1,
  },
  addresses: { lock: treasury, cold: destination, permit: '', fraud: '' },
  rwtId: '',
});
/**
 * Encode an independent parent and project its native output as a current UTXO.
 * @param salt - Synthetic parent input discriminator; defaults to 1
 * @param value - Output value in satoshis; defaults to 50000n
 * @param coinbase - Use a coinbase parent; defaults to false
 * @param confirmations - Reported current confirmations; defaults to 1
 * @returns Parent-derived native output context with the configured current status
 */
const box = (
  salt = 1,
  value = 50_000n,
  coinbase = false,
  confirmations = 1,
): BitcoinCashUtxo => {
  const parent = encodeTransactionBCH({
    version: 2,
    locktime: 0,
    inputs: [
      {
        outpointTransactionHash: coinbase
          ? new Uint8Array(32)
          : new Uint8Array(32).fill(salt),
        outpointIndex: coinbase ? 0xffffffff : 0,
        sequenceNumber: 0xffffffff,
        unlockingBytecode: coinbase ? Uint8Array.of(1, 1) : new Uint8Array(),
      },
    ],
    outputs: [
      { lockingBytecode: hexToBin(treasuryScript), valueSatoshis: value },
    ],
  });
  return {
    txId: hashTransaction(parent),
    index: 0,
    value,
    scriptPubKey: treasuryScript,
    parentTransactionHex: binToHex(parent),
    coinbase,
    confirmations,
  };
};
/**
 * Build a single native payment to the synthetic destination.
 * @param value - Rosen native payment amount; defaults to 10000n
 * @returns A token-free payment order
 */
const order = (value = 10_000n): PaymentOrder => [
  { address: destination, assets: { nativeToken: value, tokens: [] } },
];
/**
 * Create a chain with mutable deterministic network and signing seams.
 * @param boxes - Treasury outputs; defaults to one ordinary confirmed box
 * @param changes - Configuration overrides; defaults to the valid fixture policy
 * @param realTokens - Optional real TokenMap; omission uses identity conversion mocks
 * @returns Chain, network, mediator, token map, current output map and generation helper
 */
const setup = (
  boxes: BitcoinCashUtxo[] = [box()],
  changes: Partial<BitcoinCashConfigs> = {},
  realTokens?: TokenMap,
) => {
  const current = new Map(
    boxes.map((utxo) => [getBchOutpointId(utxo.txId, utxo.index), utxo]),
  );
  const network = {
    /** Provide the getAddressBoxes test seam for the current scenario without external requests. */
    getAddressBoxes: vi.fn(
      async (_address: string, offset: number, limit: number) =>
        boxes.slice(offset, offset + limit),
    ),
    /** Provide the getUtxo test seam for the current scenario without external requests. */
    getUtxo: vi.fn(async (id: string) => current.get(id)),
    /** Provide the getPrevout test seam for the current scenario without external requests. */
    getPrevout: vi.fn(async (id: string) => {
      const prevout = current.get(id);
      if (!prevout) throw Error('Missing parent');
      return prevout;
    }),
    /** Provide the isBoxUnspentAndValid test seam for the current scenario without external requests. */
    isBoxUnspentAndValid: vi.fn(async () => true),
    // Retain the argument type for assertions on recorded submitted envelopes.
    /** Provide the submitTransaction test seam for the current scenario without external requests. */
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    submitTransaction: vi.fn(async (_tx: BitcoinCashTransaction) => undefined),
    /** Provide the findSignedTransaction test seam for the current scenario without external requests. */
    findSignedTransaction: vi.fn(
      async (): Promise<Uint8Array | undefined> => undefined,
    ),
    /** Provide the getMempoolTransactions test seam for the current scenario without external requests. */
    getMempoolTransactions: vi.fn(async () => []),
    /** Provide the isTxInMempool test seam for the current scenario without external requests. */
    isTxInMempool: vi.fn(async () => true),
    /** Provide the getTxConfirmation test seam for the current scenario without external requests. */
    getTxConfirmation: vi.fn(async () => 1),
  };
  const mediator: EcdsaSignMediator = {
    /** Provide the isInSign test seam for the current scenario without external requests. */
    isInSign: vi.fn(async () => false),
    /** Provide the sign test seam for the current scenario without external requests. */
    sign: vi.fn(async (digest) => {
      const signature = secp256k1.signMessageHashCompact(privateKey, digest);
      if (typeof signature === 'string') throw Error(signature);
      return { signature: binToHex(signature), signatureRecovery: '0' };
    }),
  };
  const tokens =
    realTokens ??
    ({
      /** Provide the wrapAmount test seam for the current scenario without external requests. */
      wrapAmount: vi.fn((_id, amount) => ({ amount })),
      /** Provide the unwrapAmount test seam for the current scenario without external requests. */
      unwrapAmount: vi.fn((_id, amount) => ({ amount })),
    } as unknown as TokenMap);
  const chain = new BitcoinCashChain(
    network as unknown as AbstractBitcoinCashNetwork,
    { ...config(), ...changes },
    tokens,
    mediator,
  );
  /**
   * Generate a payment under the configured treasury and reservation fixtures.
   * @param payment - Payment order; defaults to the standard single-output order
   * @param unsigned - Pending unsigned reservations; defaults to an empty list
   * @param signed - Raw signed reservations; defaults to an empty list
   * @returns The generated unsigned BCH payment envelope
   */
  const generate = (
    payment = order(),
    unsigned: BitcoinCashTransaction[] = [],
    signed: string[] = [],
  ) =>
    chain.generateTransaction(
      'event',
      TransactionType.payment,
      payment,
      unsigned,
      signed,
    ) as Promise<BitcoinCashTransaction>;
  return { chain, network, mediator, tokens, current, generate };
};
/**
 * Edit decoded transaction fields while retaining the original envelope context.
 * @param tx - Original BCH envelope
 * @param edit - Mutation applied to the decoded body
 * @returns A new envelope carrying the altered canonical bytes
 */
const mutate = (
  tx: BitcoinCashTransaction,
  edit: (body: ReturnType<typeof decodeBchTransaction>) => void,
): BitcoinCashTransaction => {
  const body = decodeBchTransaction(tx.txBytes);
  edit(body);
  return new BitcoinCashTransaction(
    tx.eventId,
    encodeTransactionBCH(body),
    tx.txType,
    tx.prevouts,
    tx.publicKey,
  );
};

describe('BitcoinCashChain', () => {
  describe('constructor', () => {
    /**
     * @target BitcoinCashChain.constructor - validates the same snapshot later
     * consumed by confirmation lookup
     * @dependencies setup/config and an observation-threshold getter whose
     * later reads would change
     * @scenario Construct the chain and query a zero-confirmation source
     * deposit.
     * @expected Read the threshold once and retain NotConfirmedEnough from
     * that validated snapshot.
     */
    it('validates the same snapshot later consumed by confirmation lookup', async () => {
      const { network, tokens, mediator } = setup();
      const supplied = config();
      let reads = 0;
      Object.defineProperty(supplied.confirmations, 'observation', {
        enumerable: true,
        /** Provide the get test seam for the current scenario without external requests. */
        get: () => (++reads <= 2 ? 1 : 0),
      });
      const chain = new BitcoinCashChain(
        network as unknown as AbstractBitcoinCashNetwork,
        supplied,
        tokens,
        mediator,
      );
      network.getTxConfirmation.mockResolvedValue(0);
      expect(
        await chain.getTxConfirmationStatus(
          'ab'.repeat(32),
          TransactionType.lock,
        ),
      ).toEqual(ConfirmationStatus.NotConfirmedEnough);
      expect(reads).toEqual(1);
    });
    /**
     * @target BitcoinCashChain.constructor - rejects nonenumerable
     * confirmation fields omitted from the snapshot
     * @dependencies config with a nonenumerable observation field
     * @scenario Construct a chain whose serialized own-enumerable policy would
     * omit the field.
     * @expected Reject the missing confirmation policy.
     */
    it('rejects nonenumerable confirmation fields omitted from the snapshot', () => {
      const { network, tokens, mediator } = setup();
      const supplied = config();
      Object.defineProperty(supplied.confirmations, 'observation', {
        value: 1,
        enumerable: false,
      });
      expect(
        () =>
          new BitcoinCashChain(
            network as unknown as AbstractBitcoinCashNetwork,
            supplied,
            tokens,
            mediator,
          ),
      ).toThrow('confirmations');
    });

    describe.each([
      'observation',
      'payment',
      'cold',
      'manual',
      'arbitrary',
    ] as const)('%s confirmation policy', (key) => {
      describe('constructor', () => {
        /**
         * @target BitcoinCashChain.constructor - rejects invalid threshold %#
         * before construction
         * @dependencies config and describe.each across all five confirmation
         * categories
         * @scenario Supply zero, negative, fractional, nonfinite, string, null
         * or undefined confirmation thresholds.
         * @expected Reject each category/vector as requiring positive safe
         * integers.
         */
        it.each([0, -1, 0.5, NaN, Infinity, '1', null, undefined])(
          'rejects invalid threshold %# before construction',
          (value) => {
            const confirmations = { ...config().confirmations, [key]: value };
            expect(() =>
              setup([], {
                confirmations,
              } as unknown as Partial<BitcoinCashConfigs>),
            ).toThrow('confirmations must be positive safe integers');
          },
        );
        /**
         * @target BitcoinCashChain.constructor - rejects an inherited
         * threshold that the frozen policy would omit
         * @dependencies config with each confirmation category moved to the
         * prototype
         * @scenario Construct a chain with a required threshold absent from
         * the
         * own policy snapshot.
         * @expected Reject the confirmation policy.
         */
        it('rejects an inherited threshold that the frozen policy would omit', () => {
          const confirmations = { ...config().confirmations };
          Reflect.deleteProperty(confirmations, key);
          Object.setPrototypeOf(confirmations, { [key]: 1 });
          expect(() => setup([], { confirmations })).toThrow('confirmations');
        });
      });
    });
    describe('native policy fields', () => {
      /**
       * @target BitcoinCashChain.constructor - rejects invalid config %#
       * @dependencies Fee-rate, fee-cap, minimum-output, page-bound and key
       * mismatch vectors
       * @scenario Override one valid fixture configuration field with an
       * invalid
       * value.
       * @expected Reject construction for every invalid policy vector.
       */
      it.each([
        { feeRate: 0 },
        { feeRate: 1.1 },
        { maxFee: 0n },
        { minimumUtxoValue: 545n },
        { maxUtxoPages: 0 },
        { maxUtxoPages: 101 },
        { aggregatedPublicKey: publicKey.replace('02', '03') },
      ])('rejects invalid config %#', (change) => {
        expect(() => setup(undefined, change)).toThrow();
      });
    });
  });
  describe('generateTransaction', () => {
    /**
     * @target BitcoinCashChain.generateTransaction - preserves exact satoshi
     * change and fees with a real lower-decimal TokenMap
     * @dependencies Real TokenMap with BCH8/Ergo6 and a 50017-satoshi parent
     * @scenario Generate a 100-unit Rosen payment, inspect
     * assets/change/minimum, then shift one satoshi from change to payout.
     * @expected Keep exact 10000/39790-satoshi outputs and valid fees; reject
     * the inexact altered payout.
     */
    it('preserves exact satoshi change and fees with a real lower-decimal TokenMap', async () => {
      const tokens = new TokenMap();
      await tokens.updateConfigByJson([
        {
          'bitcoin-cash': {
            tokenId: 'bch',
            name: 'BCH',
            decimals: 8,
            type: 'native',
            residency: 'native',
            extra: {},
          },
          ergo: {
            tokenId: 'bb'.repeat(32),
            name: 'rsBCH',
            decimals: 6,
            type: 'wrapped',
            residency: 'wrapped',
            extra: {},
          },
        },
      ]);
      const { chain, generate } = setup([box(1, 50_017n)], {}, tokens);
      const payment = await generate(order(100n));
      const body = decodeBchTransaction(payment.txBytes);
      expect(body.outputs.map((output) => output.valueSatoshis)).toEqual([
        10_000n,
        39_790n,
      ]);
      expect(chain.extractTransactionOrder(payment)).toEqual(order(100n));
      expect(chain.getMinimumNativeToken()).toEqual(6n);
      expect(await chain.getTransactionAssets(payment)).toEqual({
        inputAssets: { nativeToken: 501n, tokens: [] },
        outputAssets: { nativeToken: 498n, tokens: [] },
      });
      expect(await chain.verifyTransactionFee(payment)).toEqual(true);
      const inexactPayout = mutate(payment, (tx) => {
        tx.outputs[0].valueSatoshis += 1n;
        tx.outputs[1].valueSatoshis -= 1n;
      });
      expect(await chain.verifyPaymentTransaction(inexactPayout)).toEqual(
        false,
      );
    });

    describe('serialized native payments', () => {
      /**
       * @target BitcoinCashChain.generateTransaction - builds exact v2
       * locktime-zero payouts and final treasury change with serialized-byte
       * fee
       * @dependencies setup with one 50000-satoshi native parent and the
       * standard payment
       * @scenario Generate and inspect transaction bytes, extracted order,
       * exact
       * fee and input/output balances.
       * @expected Produce version 2, locktime 0, final sequence, 10000
       * payout/39773 change and a valid exact fee.
       */
      it('builds exact v2 locktime-zero payouts and final treasury change with serialized-byte fee', async () => {
        const { chain, generate } = setup();
        const tx = await generate();
        const body = decodeBchTransaction(tx.txBytes);
        expect(body.version).toEqual(2);
        expect(body.locktime).toEqual(0);
        expect(body.inputs[0].sequenceNumber).toEqual(0xffffffff);
        expect(body.outputs.map((output) => output.valueSatoshis)).toEqual([
          10_000n,
          39_773n,
        ]);
        expect(binToHex(body.outputs[1].lockingBytecode)).toEqual(
          treasuryScript,
        );
        expect(chain.extractTransactionOrder(tx)).toEqual(order());
        expect(await chain.verifyTransactionFee(tx)).toEqual(true);
        expect(await chain.getTransactionAssets(tx)).toEqual({
          inputAssets: { nativeToken: 50_000n, tokens: [] },
          outputAssets: { nativeToken: 49_773n, tokens: [] },
        });
      });
      /**
       * @target BitcoinCashChain.generateTransaction - supports ordinary P2SH
       * payments
       * @dependencies cashAddress helper and the standard native order
       * @scenario Replace the recipient with an ordinary P2SH destination.
       * @expected Generate a payment whose extracted order exactly matches the
       * P2SH order.
       */
      it('supports ordinary P2SH payments', async () => {
        const { chain, generate } = setup();
        const payment = order();
        payment[0].address = cashAddress('a914' + '12'.repeat(20) + '87');
        expect(chain.extractTransactionOrder(await generate(payment))).toEqual(
          payment,
        );
      });
      /**
       * @target BitcoinCashChain.generateTransaction - rejects invalid orders
       * %#
       * @dependencies Empty/extra-metadata/treasury-recipient/token/dust/zero
       * payment vectors
       * @scenario Generate each order outside the accepted native payment
       * policy.
       * @expected Reject every invalid order.
       */
      it.each(
        [
          [],
          [{ ...order()[0], extra: '' }],
          [{ ...order()[0], extra: 'metadata' }],
          [{ ...order()[0], address: treasury }],
          [
            {
              address: destination,
              assets: {
                nativeToken: 1000n,
                tokens: [{ id: 'token', value: 1n }],
              },
            },
          ],
          order(545n),
          order(0n),
        ].map((payment) => [payment]),
      )('rejects invalid orders %#', async (payment) => {
        await expect(setup().generate(payment)).rejects.toThrow();
      });
    });
    describe('conversion and input limits', () => {
      /**
       * @target BitcoinCashChain.generateTransaction - rejects inexact Rosen
       * satoshi conversions
       * @dependencies unwrapAmount mock that subtracts one native unit
       * @scenario Generate a payment whose token conversion cannot round-trip
       * exactly.
       * @expected Reject the round-trip mismatch.
       */
      it('rejects inexact Rosen satoshi conversions', async () => {
        const { generate, tokens } = setup();
        vi.mocked(tokens.unwrapAmount).mockImplementation((_id, amount) => ({
          amount: amount - 1n,
          decimals: 0,
        }));
        await expect(generate()).rejects.toThrow('round-trip');
      });
      /**
       * @target BitcoinCashChain.generateTransaction - keeps minimum change
       * and never donates dust to fees
       * @dependencies Parents funding payout plus fee plus 545 or 546 satoshis
       * change
       * @scenario Generate immediately below and at the minimum change
       * boundary.
       * @expected Reject insufficient dust change and retain exactly 546
       * satoshis at the boundary.
       */
      it('keeps minimum change and never donates dust to fees', async () => {
        await expect(
          setup([box(1, 10_000n + 227n + 545n)]).generate(),
        ).rejects.toThrow('Insufficient');
        const tx = await setup([box(1, 10_000n + 227n + 546n)]).generate();
        expect(
          decodeBchTransaction(tx.txBytes).outputs[1].valueSatoshis,
        ).toEqual(546n);
      });
      /**
       * @target BitcoinCashChain.generateTransaction - enforces an exact fee
       * cap
       * @dependencies Standard parent/order with maxFee=226n
       * @scenario Generate a transaction requiring the fixture's 227-satoshi
       * fee.
       * @expected Reject the exceeded fee cap.
       */
      it('enforces an exact fee cap', async () => {
        await expect(
          setup(undefined, { maxFee: 226n }).generate(),
        ).rejects.toThrow('cap');
      });
      /**
       * @target BitcoinCashChain.generateTransaction - excludes every unsigned
       * and signed input reservation without chaining
       * @dependencies Three independent parents plus unsigned and signed
       * reservation envelopes
       * @scenario Reserve the first two parents and generate a new native
       * payment.
       * @expected Select only the third unreserved parent.
       */
      it('excludes every unsigned and signed input reservation without chaining', async () => {
        const first = box(1);
        const second = box(2);
        const third = box(3);
        const unsigned = await setup([first]).generate();
        const signedSetup = setup([second]);
        const signed = await signedSetup.chain.signTransaction(
          await signedSetup.generate(),
        );
        const { generate } = setup([first, second, third]);
        const tx = await generate(
          order(),
          [unsigned],
          [signed.getTxHexString()],
        );
        expect(tx.prevouts.map((input) => input.txId)).toEqual([third.txId]);
      });
      /**
       * @target BitcoinCashChain.generateTransaction - rejects unsigned bytes
       * in signed reservations %s
       * @dependencies Ordinary unsigned bytes and malformed foreign-byte
       * vectors
       * @scenario Place either unsigned transaction hex or hex 00 in signed
       * reservations.
       * @expected Reject both reservation forms.
       */
      it.each([false, true])(
        'rejects unsigned bytes in signed reservations %s',
        async (foreign) => {
          const tx = await setup().generate();
          const { generate } = setup();
          await expect(
            generate(order(), [], [foreign ? '00' : tx.getTxHexString()]),
          ).rejects.toThrow();
        },
      );
      /**
       * @target BitcoinCashChain.generateTransaction - does not select
       * unconfirmed inputs or immature coinbase outputs
       * @dependencies Unconfirmed ordinary and 99/100-confirmation coinbase
       * parent vectors
       * @scenario Generate payments from each availability/maturity state.
       * @expected Reject unusable inputs and select the coinbase output at
       * exactly 100 confirmations.
       */
      it('does not select unconfirmed inputs or immature coinbase outputs', async () => {
        await expect(
          setup([box(1, 50_000n, false, 0)]).generate(),
        ).rejects.toThrow('Insufficient');
        await expect(
          setup([box(1, 50_000n, true, 99)]).generate(),
        ).rejects.toThrow('Insufficient');
        expect(
          (await setup([box(1, 50_000n, true, 100)]).generate()).prevouts,
        ).toHaveLength(1);
      });
      /**
       * @target BitcoinCashChain.generateTransaction - rejects forged network
       * value, script, parent and coinbase metadata
       * @dependencies box fixture with isolated
       * value/script/parent/coinbase/confirmation faults
       * @scenario Generate from each network row inconsistent with its parent
       * or
       * current policy.
       * @expected Reject every forged row.
       */
      it('rejects forged network value, script, parent and coinbase metadata', async () => {
        for (const edit of [
          { value: 50_001n },
          { scriptPubKey: '76a914' + '00'.repeat(20) + '88ac' },
          { parentTransactionHex: '00' },
          { coinbase: true },
          { confirmations: NaN },
        ]) {
          await expect(
            setup([{ ...box(), ...edit }]).generate(),
          ).rejects.toThrow();
        }
      });
      /**
       * @target BitcoinCashChain.generateTransaction - rejects duplicate
       * inputs and bounded output/input overflow
       * @dependencies Duplicate outpoints, 100 payment outputs and 101
       * distinct
       * candidate inputs
       * @scenario Exercise duplicate-input and bounded transaction-cardinality
       * limits.
       * @expected Reject duplicate, bounded-output and input-limit cases with
       * their expected errors.
       */
      it('rejects duplicate inputs and bounded output/input overflow', async () => {
        const utxo = box();
        await expect(
          setup([utxo, utxo]).generate(order(60_000n)),
        ).rejects.toThrow('Duplicate');
        await expect(
          setup().generate(Array.from({ length: 100 }, () => order()[0])),
        ).rejects.toThrow('bounded');
        await expect(
          setup(
            Array.from({ length: 101 }, (_, i) => box(i + 1, 1000n)),
            { maxUtxoPages: 100 },
          ).generate(order(200_000n)),
        ).rejects.toThrow('input limit');
      });
      /**
       * @target BitcoinCashChain.generateTransaction - stops pagination at the
       * configured bound
       * @dependencies One-page configuration and a full page of unusable
       * outputs
       * @scenario Generate while RPC keeps returning a full unusable page.
       * @expected Reject exhausted bounds after exactly one address-box call.
       */
      it('stops pagination at the configured bound', async () => {
        const { generate, network } = setup([], { maxUtxoPages: 1 });
        network.getAddressBoxes.mockResolvedValue(
          Array.from({ length: GET_BOX_API_LIMIT }, (_, i) =>
            box(i + 1, 1000n, false, 0),
          ),
        );
        await expect(generate()).rejects.toThrow('bounds');
        expect(network.getAddressBoxes).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe('getTxConfirmationStatus', () => {
    /**
     * @target BitcoinCashChain.getTxConfirmationStatus - rejects coerced
     * source transaction IDs before network lookup
     * @dependencies setup with a coercible object masquerading as a source
     * hash
     * @scenario Query a source deposit with a nonstring ID whose toString
     * returns a valid hash.
     * @expected Reject source-deposit context and make no confirmation RPC
     * call.
     */
    it('rejects coerced source transaction IDs before network lookup', async () => {
      const { chain, network } = setup();
      const sourceId = {
        /** function toString() { [native code] } */
        toString: () => 'ab'.repeat(32),
      } as unknown as string;
      await expect(
        chain.getTxConfirmationStatus(sourceId, TransactionType.lock),
      ).rejects.toThrow('source-deposit');
      expect(network.getTxConfirmation).not.toHaveBeenCalled();
    });
    /**
     * @target BitcoinCashChain.getTxConfirmationStatus - confirms source
     * deposits by their actual ID with confirmation count %s
     * @dependencies getTxConfirmation mock returning -1, 0 or 1
     * @scenario Query a lock/source transaction by its actual canonical hash.
     * @expected Map the count to the expected status, call that hash exactly
     * once and skip spending recovery/UTXO lookup.
     */
    it.each([
      [-1, ConfirmationStatus.NotFound],
      [0, ConfirmationStatus.NotConfirmedEnough],
      [1, ConfirmationStatus.ConfirmedEnough],
    ])(
      'confirms source deposits by their actual ID with confirmation count %s',
      async (confirmation, expected) => {
        const { chain, network } = setup();
        const sourceId = 'ab'.repeat(32);
        network.getTxConfirmation.mockResolvedValue(confirmation);
        expect(
          await chain.getTxConfirmationStatus(sourceId, TransactionType.lock),
        ).toEqual(expected);
        expect(network.getTxConfirmation).toHaveBeenCalledExactlyOnceWith(
          sourceId,
        );
        expect(network.findSignedTransaction).not.toHaveBeenCalled();
        expect(network.getUtxo).not.toHaveBeenCalled();
      },
    );
    /**
     * @target BitcoinCashChain.getTxConfirmationStatus - rejects malformed
     * source transaction IDs %# before network lookup
     * @dependencies Uppercase, short, nonhex and empty source hash vectors
     * @scenario Query source-deposit confirmations using each malformed hash.
     * @expected Reject source-deposit context before any network confirmation
     * lookup.
     */
    it.each(['AB'.repeat(32), 'ab'.repeat(31), 'ag'.repeat(32), ''])(
      'rejects malformed source transaction IDs %# before network lookup',
      async (sourceId) => {
        const { chain, network } = setup();
        await expect(
          chain.getTxConfirmationStatus(sourceId, TransactionType.lock),
        ).rejects.toThrow('source-deposit');
        expect(network.getTxConfirmation).not.toHaveBeenCalled();
      },
    );
    /**
     * @target BitcoinCashChain.getTxConfirmationStatus - rejects payment
     * envelopes supplied as source-deposit confirmation context
     * @dependencies generate helper producing a payment envelope
     * @scenario Supply a payment approval and envelope to the source-deposit
     * confirmation route.
     * @expected Reject source-deposit context before network lookup.
     */
    it('rejects payment envelopes supplied as source-deposit confirmation context', async () => {
      const { chain, network, generate } = setup();
      const tx = await generate();
      await expect(
        chain.getTxConfirmationStatus(tx.txId, TransactionType.lock, tx),
      ).rejects.toThrow('source-deposit');
      expect(network.getTxConfirmation).not.toHaveBeenCalled();
    });
    /**
     * @target BitcoinCashChain.getTxConfirmationStatus - requires persisted
     * approval context for %s confirmations
     * @dependencies Payment, cold, manual, arbitrary and reward
     * transaction-type vectors
     * @scenario Query spending confirmations without a persisted approval
     * envelope.
     * @expected Reject the missing persisted envelope and make no confirmation
     * RPC call.
     */
    it.each([
      TransactionType.payment,
      TransactionType.coldStorage,
      TransactionType.manual,
      TransactionType.arbitrary,
      TransactionType.reward,
    ])(
      'requires persisted approval context for %s confirmations',
      async (txType) => {
        const { chain, network } = setup();
        await expect(
          chain.getTxConfirmationStatus('ab'.repeat(32), txType),
        ).rejects.toThrow('persisted envelope');
        expect(network.getTxConfirmation).not.toHaveBeenCalled();
      },
    );
    /**
     * @target BitcoinCashChain.getTxConfirmationStatus - rejects malformed
     * source confirmation counts %#
     * @dependencies getTxConfirmation mock returning invalid numeric counts
     * @scenario Supply -2, fractional, NaN, Infinity or an unsafe integer
     * count for a source deposit.
     * @expected Reject the malformed BCH confirmation count.
     */
    it.each([-2, 0.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1])(
      'rejects malformed source confirmation counts %#',
      async (confirmation) => {
        const { chain, network } = setup();
        network.getTxConfirmation.mockResolvedValue(confirmation);
        await expect(
          chain.getTxConfirmationStatus('ab'.repeat(32), TransactionType.lock),
        ).rejects.toThrow('Malformed BCH confirmation');
      },
    );
  });
  describe('isTransactionInSign', () => {
    /**
     * @target BitcoinCashChain.isTransactionInSign - fails closed on
     * nonboolean network and signing statuses
     * @dependencies Mutable mediator/network boolean status mocks
     * @scenario Return string true from signing-state, UTXO-validity and
     * mempool-status seams.
     * @expected Reject malformed statuses, refuse invalid-input signing and
     * preserve the mediator call boundary.
     */
    it('fails closed on nonboolean network and signing statuses', async () => {
      const { chain, generate, network, mediator } = setup();
      const tx = await generate();
      vi.mocked(mediator.isInSign).mockResolvedValue(
        'true' as unknown as boolean,
      );
      await expect(chain.isTransactionInSign(tx)).rejects.toThrow('Malformed');
      network.isBoxUnspentAndValid.mockResolvedValue(
        'true' as unknown as boolean,
      );
      await expect(chain.signTransaction(tx)).rejects.toThrow(
        'invalid treasury',
      );
      expect(mediator.sign).not.toHaveBeenCalled();
      network.isBoxUnspentAndValid.mockResolvedValue(true);
      const signed = await chain.signTransaction(tx);
      network.isTxInMempool.mockResolvedValue('true' as unknown as boolean);
      await expect(chain.isTxInMempool(tx.txId, signed)).rejects.toThrow(
        'Malformed',
      );
    });
  });

  describe('verifyPaymentTransaction', () => {
    /**
     * @target BitcoinCashChain.verifyPaymentTransaction - rejects %s mutation
     * @dependencies mutate helper applied to a valid generated envelope
     * @scenario Individually change version, locktime, sequence, change
     * script, payout script or fee.
     * @expected Return false from payment verification and extra-condition
     * verification.
     */
    it.each(['version', 'locktime', 'sequence', 'change', 'payout', 'fee'])(
      'rejects %s mutation',
      async (field) => {
        const { chain, generate } = setup();
        const tx = await generate();
        const edited = mutate(tx, (body) => {
          if (field === 'version') body.version = 1;
          if (field === 'locktime') body.locktime = 1;
          if (field === 'sequence') body.inputs[0].sequenceNumber--;
          if (field === 'change')
            body.outputs[1].lockingBytecode = body.outputs[0].lockingBytecode;
          if (field === 'payout')
            body.outputs[0].lockingBytecode = body.outputs[1].lockingBytecode;
          if (field === 'fee') body.outputs[1].valueSatoshis--;
        });
        expect(await chain.verifyPaymentTransaction(edited)).toEqual(false);
        expect(
          chain.verifyTransactionExtraConditions(
            edited,
            SigningStatus.UnSigned,
          ),
        ).toEqual(false);
      },
    );
  });
  describe('signTransaction', () => {
    /**
     * @target BitcoinCashChain.signTransaction - calls mediator with exact
     * ForkID digest and independently verifies returned signature
     * @dependencies Synthetic secp256k1 mediator and getBchSigningDigest
     * reference
     * @scenario Sign the generated envelope and round-trip the signed JSON.
     * @expected Send the exact digest, retain approval ID and restore the
     * distinct actual signed hash.
     */
    it('calls mediator with exact ForkID digest and independently verifies returned signature', async () => {
      const { chain, generate, mediator } = setup();
      const tx = await generate();
      const signed = await chain.signTransaction(tx);
      expect(mediator.sign).toHaveBeenCalledWith(
        getBchSigningDigest(tx.txBytes, tx.prevouts, treasuryScript, 0),
      );
      expect(signed.isSigned()).toEqual(true);
      expect(signed.txId).toEqual(tx.txId);
      expect(signed.getActualTxId()).not.toEqual(tx.txId);
      expect(
        chain.PaymentTransactionFromJson(signed.toJson()).getActualTxId(),
      ).toEqual(signed.getActualTxId());
    });
    /**
     * @target BitcoinCashChain.signTransaction - rejects malformed mediator
     * signature %#
     * @dependencies Mediator signature vectors: short, invalid scalar, nonhex
     * and overlong
     * @scenario Attempt to sign with each malformed compact signature result.
     * @expected Reject finalization and never submit to the network.
     */
    it.each(['00', '00'.repeat(64), 'gg', '11'.repeat(65)])(
      'rejects malformed mediator signature %#',
      async (signature) => {
        const { chain, generate, mediator, network } = setup();
        vi.mocked(mediator.sign).mockResolvedValue({
          signature,
          signatureRecovery: '0',
        });
        await expect(chain.signTransaction(await generate())).rejects.toThrow();
        expect(network.submitTransaction).not.toHaveBeenCalled();
      },
    );
    /**
     * @target BitcoinCashChain.signTransaction - checks signing state and
     * current network UTXOs before signing or submitting
     * @dependencies Mutable current UTXO map and mediator/network call spies
     * @scenario Submit unsigned, sign already signed, then remove current
     * inputs before submit/sign/validity checks.
     * @expected Reject each invalid state/input, make only one valid signing
     * pass and never submit.
     */
    it('checks signing state and current network UTXOs before signing or submitting', async () => {
      const { chain, generate, mediator, network, current } = setup();
      const tx = await generate();
      await expect(chain.submitTransaction(tx)).rejects.toThrow(
        'signing state',
      );
      const signed = await chain.signTransaction(tx);
      await expect(chain.signTransaction(signed)).rejects.toThrow(
        'signing state',
      );
      current.clear();
      await expect(chain.submitTransaction(signed)).rejects.toThrow(
        'invalid treasury',
      );
      await expect(chain.signTransaction(tx)).rejects.toThrow(
        'invalid treasury',
      );
      expect(mediator.sign).toHaveBeenCalledTimes(1);
      expect(network.submitTransaction).not.toHaveBeenCalled();
      expect(
        (await chain.isTxValid(tx, SigningStatus.UnSigned)).details?.unexpected,
      ).toEqual(true);
    });

    describe('asynchronous caller mutation', () => {
      /**
       * @target BitcoinCashChain.signTransaction - never signs a caller
       * mutation during asynchronous prevout validation
       * @dependencies getUtxo mock mutating the caller approval ID during
       * awaited validation
       * @scenario Attempt to sign the envelope after the asynchronous seam
       * changes its identity.
       * @expected Reject before invoking the signing mediator.
       */
      it('never signs a caller mutation during asynchronous prevout validation', async () => {
        const { chain, generate, network, mediator } = setup();
        const tx = await generate();
        network.getUtxo.mockImplementation(async () => {
          tx.txId = '00'.repeat(32);
          return box();
        });
        await expect(chain.signTransaction(tx)).rejects.toThrow();
        expect(mediator.sign).not.toHaveBeenCalled();
      });
    });
  });
  describe('submitTransaction', () => {
    /**
     * @target BitcoinCashChain.submitTransaction - submits only a verified
     * signed envelope, and queries only signed chain ID
     * @dependencies Generated and signed envelope plus network spies
     * @scenario Submit, resolve actual ID, query confirmations/mempool and
     * attempt context-free actual-ID resolution.
     * @expected Submit exact signed JSON, query only the signed hash, and
     * reject missing persisted context.
     */
    it('submits only a verified signed envelope, and queries only signed chain ID', async () => {
      const { chain, generate, network } = setup();
      const signed = await chain.signTransaction(await generate());
      await chain.submitTransaction(signed);
      expect(network.submitTransaction).toHaveBeenCalledTimes(1);
      expect(network.submitTransaction.mock.calls[0][0].toJson()).toEqual(
        signed.toJson(),
      );
      expect(await chain.getActualTxId(signed.txId, signed)).toEqual(
        signed.getActualTxId(),
      );
      expect(
        await chain.getTxConfirmationStatus(
          signed.txId,
          TransactionType.payment,
          signed,
        ),
      ).toEqual(ConfirmationStatus.ConfirmedEnough);
      await chain.isTxInMempool(signed.txId, signed);
      expect(network.getTxConfirmation).toHaveBeenCalledWith(
        signed.getActualTxId(),
      );
      expect(network.isTxInMempool).toHaveBeenCalledWith(
        signed.getActualTxId(),
      );
      await expect(chain.getActualTxId(signed.txId)).rejects.toThrow(
        'persisted',
      );
    });
  });
  describe('getActualTxId', () => {
    /**
     * @target BitcoinCashChain.getActualTxId - restores matching signed body
     * from persisted unsigned context without using approval hash as chain ID
     * @dependencies Unsigned envelope, matching signed recovery bytes and
     * spent current map
     * @scenario Resolve actual identity and recovered envelope after its
     * inputs are no longer available.
     * @expected Return the matching signed hash and exact signed JSON.
     */
    it('restores matching signed body from persisted unsigned context without using approval hash as chain ID', async () => {
      const { chain, generate, network, current } = setup();
      const tx = await generate();
      const signed = await chain.signTransaction(tx);
      current.clear();
      network.findSignedTransaction.mockResolvedValue(signed.txBytes);
      expect(await chain.getActualTxId(tx.txId, tx)).toEqual(
        signed.getActualTxId(),
      );
      expect((await chain.getRecoveredTransaction(tx))?.toJson()).toEqual(
        signed.toJson(),
      );
    });

    describe('unusable recovery candidates', () => {
      /**
       * @target BitcoinCashChain.getActualTxId - rejects mismatched, unsigned
       * and invalid recovery candidates; freezes unmatched spent approvals
       * @dependencies Foreign/unsigned/malformed recovery bytes, spent inputs
       * and failed recovery scan
       * @scenario Resolve an unsigned approval against unusable recovery
       * candidates and unavailable inputs.
       * @expected Reject each candidate, refuse unmatched spent approval
       * identity and propagate exhausted scan errors.
       */
      it('rejects mismatched, unsigned and invalid recovery candidates; freezes unmatched spent approvals', async () => {
        const { chain, generate, network, current } = setup();
        const tx = await generate();
        const signed = await chain.signTransaction(tx);
        const other = await setup().chain.signTransaction(
          await setup().generate(order(11_000n)),
        );
        for (const bytes of [other.txBytes, tx.txBytes, Uint8Array.of(0)]) {
          network.findSignedTransaction.mockResolvedValue(bytes);
          await expect(chain.getActualTxId(tx.txId, tx)).rejects.toThrow();
        }
        network.findSignedTransaction.mockResolvedValue(undefined);
        current.clear();
        await expect(chain.getActualTxId(tx.txId, tx)).rejects.toThrow(
          'inputs are unavailable',
        );
        network.findSignedTransaction.mockRejectedValue(
          Error('Recovery scan limit exceeded'),
        );
        await expect(
          chain.getTxConfirmationStatus(tx.txId, TransactionType.payment, tx),
        ).rejects.toThrow('limit');
        expect(signed.isSigned()).toEqual(true);
      });
    });
  });
  describe('getRecoveredTransaction', () => {
    /**
     * @target BitcoinCashChain.getRecoveredTransaction - retains an already
     * signed envelope during recovery without scanning wallet history
     * @dependencies Already signed generated envelope and recovery spy
     * @scenario Recover a persisted signed envelope.
     * @expected Preserve exact signed JSON without wallet-history lookup.
     */
    it('retains an already signed envelope during recovery without scanning wallet history', async () => {
      const { chain, generate, network } = setup();
      const signed = await chain.signTransaction(await generate());
      expect((await chain.getRecoveredTransaction(signed))?.toJson()).toEqual(
        signed.toJson(),
      );
      expect(network.findSignedTransaction).not.toHaveBeenCalled();
    });
  });

  describe('rawTxToPaymentTransaction', () => {
    /**
     * @target BitcoinCashChain.rawTxToPaymentTransaction - imports bounded raw
     * transactions only with current authenticated parents
     * @dependencies Generated canonical transaction hex and mutable current
     * parent map
     * @scenario Import with parents available, then clear parent availability
     * and import again.
     * @expected Preserve approval ID on valid import and reject unavailable
     * parents.
     */
    it('imports bounded raw transactions only with current authenticated parents', async () => {
      const { chain, generate, current } = setup();
      const tx = await generate();
      expect(
        (await chain.rawTxToPaymentTransaction(tx.getTxHexString())).txId,
      ).toEqual(tx.txId);
      current.clear();
      await expect(
        chain.rawTxToPaymentTransaction(tx.getTxHexString()),
      ).rejects.toThrow('unavailable');
    });
  });
  describe('verifyNoTokenBurned', () => {
    /**
     * @target BitcoinCashChain.verifyNoTokenBurned - rejects mutated envelopes
     * and foreign transaction shapes in token-free checks
     * @dependencies Generated envelope with a mutated approval ID and a
     * spread-object impostor
     * @scenario Check the valid envelope, then its altered identity and
     * foreign object shape.
     * @expected Accept the valid native envelope and reject altered identity
     * and foreign payment shape.
     */
    it('rejects mutated envelopes and foreign transaction shapes in token-free checks', async () => {
      const { chain, generate } = setup();
      const tx = await generate();
      expect(await chain.verifyNoTokenBurned(tx)).toEqual(true);
      tx.txId = '00'.repeat(32);
      expect(await chain.verifyNoTokenBurned(tx)).toEqual(false);
      expect(
        await chain.verifyPaymentTransaction({
          ...tx,
        } as BitcoinCashTransaction),
      ).toEqual(false);
    });
  });
  describe('verifyLockTransactionExtraConditions', () => {
    /**
     * @target BitcoinCashChain.verifyLockTransactionExtraConditions isolates
     * canonical deposit %s
     * @dependencies Real chain source verification and canonical libauth deposits with matching raw/RPC identity
     * @scenario Vary input count, output count or bytes at the exact bound and one above, preserving the native treasury and Rosen payload
     * @expected Accept each inclusive bound and reject the isolated excess without network, signing or submission
     */
    it.each([
      ['inputs at limit', 4096, 2, undefined, true],
      ['inputs above limit', 4097, 2, undefined, false],
      ['outputs at limit', 1, 4096, undefined, true],
      ['outputs above limit', 1, 4097, undefined, false],
      ['bytes at limit', 100, 2, 1_000_000, true],
      ['bytes above limit', 100, 2, 1_000_001, false],
    ] as const)(
      'isolates canonical deposit %s',
      async (_name, inputs, outputs, bytes, accepted) => {
        const { chain, network, mediator } = setup();
        const transaction = boundedDeposit(inputs, outputs, bytes);
        const encoded = hexToBin(transaction.hex);
        const decoded = decodeTransactionBCH(encoded);
        if (typeof decoded === 'string') throw Error(decoded);
        expect(decoded.inputs).toHaveLength(inputs);
        expect(decoded.outputs).toHaveLength(outputs);
        expect(transaction.vin).toHaveLength(inputs);
        expect(transaction.vout).toHaveLength(outputs);
        expect(binToHex(encodeTransactionBCH(decoded))).toEqual(
          transaction.hex,
        );
        expect(hashTransaction(encoded)).toEqual(transaction.txid);
        if (bytes !== undefined) expect(encoded.length).toEqual(bytes);
        else expect(encoded.length).toBeLessThan(1_000_000);
        expect(
          await chain.verifyLockTransactionExtraConditions(transaction, {
            hash: 'aa'.repeat(32),
            parentHash: 'bb'.repeat(32),
            height: 1,
          }),
        ).toEqual(accepted);
        expect(mediator.sign).not.toHaveBeenCalled();
        expect(network.submitTransaction).not.toHaveBeenCalled();
        expect(network.getPrevout).not.toHaveBeenCalled();
      },
    );

    /**
     * @target BitcoinCashChain.verifyLockTransactionExtraConditions - accepts
     * source-deposit cardinality above spending limits and unrelated token
     * outputs
     * @dependencies Canonical raw source transaction with 101 outputs and an
     * unrelated CashToken output
     * @scenario Check a native treasury deposit, then attach a CashToken to
     * the treasury output itself.
     * @expected Accept the source deposit and reject a token-bearing treasury
     * output.
     */
    it('accepts source-deposit cardinality above spending limits and unrelated token outputs', async () => {
      const { chain } = setup();
      const raw = {
        version: 2,
        locktime: 0,
        inputs: [
          {
            outpointTransactionHash: new Uint8Array(32).fill(1),
            outpointIndex: 0,
            sequenceNumber: 0xffffffff,
            unlockingBytecode: new Uint8Array(),
          },
        ],
        outputs: [
          { lockingBytecode: hexToBin(treasuryScript), valueSatoshis: 1000n },
          ...Array.from({ length: 100 }, (_, i) => ({
            lockingBytecode: hexToBin('76a914' + '12'.repeat(20) + '88ac'),
            valueSatoshis: 546n,
            ...(i === 0
              ? { token: { category: new Uint8Array(32).fill(1), amount: 1n } }
              : {}),
          })),
        ],
      };
      const bytes = encodeTransactionBCH(raw);
      const tx = {
        txid: hashTransaction(bytes),
        hex: binToHex(bytes),
        vin: [{ txid: '01'.repeat(32), vout: 0 }],
        vout: raw.outputs.map((output, n) => ({
          n,
          value: output.valueSatoshis.toString(),
          scriptPubKey: { hex: binToHex(output.lockingBytecode) },
        })),
      };
      expect(
        await chain.verifyLockTransactionExtraConditions(tx, {
          hash: '',
          parentHash: '',
          height: 1,
        }),
      ).toEqual(true);
      raw.outputs[0] = {
        ...raw.outputs[0],
        token: { category: new Uint8Array(32).fill(1), amount: 1n },
      } as (typeof raw.outputs)[0];
      const tokenBytes = encodeTransactionBCH(raw);
      expect(
        await chain.verifyLockTransactionExtraConditions(
          {
            ...tx,
            txid: hashTransaction(tokenBytes),
            hex: binToHex(tokenBytes),
          },
          { hash: '', parentHash: '', height: 1 },
        ),
      ).toEqual(false);
    });
  });
});
