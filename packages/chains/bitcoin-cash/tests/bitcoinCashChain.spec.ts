import {
  binToHex,
  encodeTransactionBCH,
  hashTransaction,
  hexToBin,
  lockingBytecodeToCashAddress,
  secp256k1,
} from '@bitauth/libauth';
import { describe, expect, it, vi } from 'vitest';

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
import { privateKey, publicKey, treasuryScript } from './fixtures';

const cashAddress = (script: string): string => {
  const result = lockingBytecodeToCashAddress({ bytecode: hexToBin(script) });
  if (typeof result === 'string') throw Error(result);
  return result.address;
};
const destination = cashAddress('76a914' + '12'.repeat(20) + '88ac');
const treasury = cashAddress(treasuryScript);
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
const order = (value = 10_000n): PaymentOrder => [
  { address: destination, assets: { nativeToken: value, tokens: [] } },
];
const setup = (
  boxes: BitcoinCashUtxo[] = [box()],
  changes: Partial<BitcoinCashConfigs> = {},
  realTokens?: TokenMap,
) => {
  const current = new Map(
    boxes.map((utxo) => [getBchOutpointId(utxo.txId, utxo.index), utxo]),
  );
  const network = {
    getAddressBoxes: vi.fn(
      async (_address: string, offset: number, limit: number) =>
        boxes.slice(offset, offset + limit),
    ),
    getUtxo: vi.fn(async (id: string) => current.get(id)),
    getPrevout: vi.fn(async (id: string) => {
      const prevout = current.get(id);
      if (!prevout) throw Error('Missing parent');
      return prevout;
    }),
    isBoxUnspentAndValid: vi.fn(async () => true),
    submitTransaction: vi.fn(async (_tx: BitcoinCashTransaction) => undefined),
    findSignedTransaction: vi.fn(
      async (): Promise<Uint8Array | undefined> => undefined,
    ),
    getMempoolTransactions: vi.fn(async () => []),
    isTxInMempool: vi.fn(async () => true),
    getTxConfirmation: vi.fn(async () => 1),
  };
  const mediator: EcdsaSignMediator = {
    isInSign: vi.fn(async () => false),
    sign: vi.fn(async (digest) => {
      const signature = secp256k1.signMessageHashCompact(privateKey, digest);
      if (typeof signature === 'string') throw Error(signature);
      return { signature: binToHex(signature), signatureRecovery: '0' };
    }),
  };
  const tokens =
    realTokens ??
    ({
      wrapAmount: vi.fn((_id, amount) => ({ amount })),
      unwrapAmount: vi.fn((_id, amount) => ({ amount })),
    } as unknown as TokenMap);
  const chain = new BitcoinCashChain(
    network as unknown as AbstractBitcoinCashNetwork,
    { ...config(), ...changes },
    tokens,
    mediator,
  );
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

describe('native bounded BCH chain', () => {
  it('validates the same snapshot later consumed by confirmation lookup', async () => {
    const { network, tokens, mediator } = setup();
    const supplied = config();
    let reads = 0;
    Object.defineProperty(supplied.confirmations, 'observation', {
      enumerable: true,
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
    ).toBe(ConfirmationStatus.NotConfirmedEnough);
    expect(reads).toBe(1);
  });
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
    expect(chain.getMinimumNativeToken()).toBe(6n);
    expect(await chain.getTransactionAssets(payment)).toEqual({
      inputAssets: { nativeToken: 501n, tokens: [] },
      outputAssets: { nativeToken: 498n, tokens: [] },
    });
    expect(await chain.verifyTransactionFee(payment)).toBe(true);
    const inexactPayout = mutate(payment, (tx) => {
      tx.outputs[0].valueSatoshis += 1n;
      tx.outputs[1].valueSatoshis -= 1n;
    });
    expect(await chain.verifyPaymentTransaction(inexactPayout)).toBe(false);
  });
  describe.each([
    'observation',
    'payment',
    'cold',
    'manual',
    'arbitrary',
  ] as const)('%s confirmation policy', (key) => {
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
    it('rejects an inherited threshold that the frozen policy would omit', () => {
      const confirmations = { ...config().confirmations };
      Reflect.deleteProperty(confirmations, key);
      Object.setPrototypeOf(confirmations, { [key]: 1 });
      expect(() => setup([], { confirmations })).toThrow('confirmations');
    });
  });
  it('rejects coerced source transaction IDs before network lookup', async () => {
    const { chain, network } = setup();
    const sourceId = { toString: () => 'ab'.repeat(32) } as unknown as string;
    await expect(
      chain.getTxConfirmationStatus(sourceId, TransactionType.lock),
    ).rejects.toThrow('source-deposit');
    expect(network.getTxConfirmation).not.toHaveBeenCalled();
  });
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
      ).toBe(expected);
      expect(network.getTxConfirmation).toHaveBeenCalledExactlyOnceWith(
        sourceId,
      );
      expect(network.findSignedTransaction).not.toHaveBeenCalled();
      expect(network.getUtxo).not.toHaveBeenCalled();
    },
  );
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
  it('rejects payment envelopes supplied as source-deposit confirmation context', async () => {
    const { chain, network, generate } = setup();
    const tx = await generate();
    await expect(
      chain.getTxConfirmationStatus(tx.txId, TransactionType.lock, tx),
    ).rejects.toThrow('source-deposit');
    expect(network.getTxConfirmation).not.toHaveBeenCalled();
  });
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
    await expect(chain.signTransaction(tx)).rejects.toThrow('invalid treasury');
    expect(mediator.sign).not.toHaveBeenCalled();
    network.isBoxUnspentAndValid.mockResolvedValue(true);
    const signed = await chain.signTransaction(tx);
    network.isTxInMempool.mockResolvedValue('true' as unknown as boolean);
    await expect(chain.isTxInMempool(tx.txId, signed)).rejects.toThrow(
      'Malformed',
    );
  });
  it('builds exact v2 locktime-zero payouts and final treasury change with serialized-byte fee', async () => {
    const { chain, generate } = setup();
    const tx = await generate();
    const body = decodeBchTransaction(tx.txBytes);
    expect(body.version).toBe(2);
    expect(body.locktime).toBe(0);
    expect(body.inputs[0].sequenceNumber).toBe(0xffffffff);
    expect(body.outputs.map((output) => output.valueSatoshis)).toEqual([
      10_000n,
      39_773n,
    ]);
    expect(binToHex(body.outputs[1].lockingBytecode)).toBe(treasuryScript);
    expect(chain.extractTransactionOrder(tx)).toEqual(order());
    expect(await chain.verifyTransactionFee(tx)).toBe(true);
    expect(await chain.getTransactionAssets(tx)).toEqual({
      inputAssets: { nativeToken: 50_000n, tokens: [] },
      outputAssets: { nativeToken: 49_773n, tokens: [] },
    });
  });
  it('supports ordinary P2SH payments', async () => {
    const { chain, generate } = setup();
    const payment = order();
    payment[0].address = cashAddress('a914' + '12'.repeat(20) + '87');
    expect(chain.extractTransactionOrder(await generate(payment))).toEqual(
      payment,
    );
  });
  it.each(
    [
      [],
      [{ ...order()[0], extra: '' }],
      [{ ...order()[0], extra: 'metadata' }],
      [{ ...order()[0], address: treasury }],
      [
        {
          address: destination,
          assets: { nativeToken: 1000n, tokens: [{ id: 'token', value: 1n }] },
        },
      ],
      order(545n),
      order(0n),
    ].map((payment) => [payment]),
  )('rejects invalid orders %#', async (payment) => {
    await expect(setup().generate(payment)).rejects.toThrow();
  });
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
  it('rejects inexact Rosen satoshi conversions', async () => {
    const { generate, tokens } = setup();
    vi.mocked(tokens.unwrapAmount).mockImplementation((_id, amount) => ({
      amount: amount - 1n,
      decimals: 0,
    }));
    await expect(generate()).rejects.toThrow('round-trip');
  });
  it('keeps minimum change and never donates dust to fees', async () => {
    await expect(
      setup([box(1, 10_000n + 227n + 545n)]).generate(),
    ).rejects.toThrow('Insufficient');
    const tx = await setup([box(1, 10_000n + 227n + 546n)]).generate();
    expect(decodeBchTransaction(tx.txBytes).outputs[1].valueSatoshis).toBe(
      546n,
    );
  });
  it('enforces an exact fee cap', async () => {
    await expect(setup(undefined, { maxFee: 226n }).generate()).rejects.toThrow(
      'cap',
    );
  });
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
    const tx = await generate(order(), [unsigned], [signed.getTxHexString()]);
    expect(tx.prevouts.map((input) => input.txId)).toEqual([third.txId]);
  });
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
  it('does not select unconfirmed inputs or immature coinbase outputs', async () => {
    await expect(setup([box(1, 50_000n, false, 0)]).generate()).rejects.toThrow(
      'Insufficient',
    );
    await expect(setup([box(1, 50_000n, true, 99)]).generate()).rejects.toThrow(
      'Insufficient',
    );
    expect(
      (await setup([box(1, 50_000n, true, 100)]).generate()).prevouts,
    ).toHaveLength(1);
  });
  it('rejects forged network value, script, parent and coinbase metadata', async () => {
    for (const edit of [
      { value: 50_001n },
      { scriptPubKey: '76a914' + '00'.repeat(20) + '88ac' },
      { parentTransactionHex: '00' },
      { coinbase: true },
      { confirmations: NaN },
    ]) {
      await expect(setup([{ ...box(), ...edit }]).generate()).rejects.toThrow();
    }
  });
  it('rejects duplicate inputs and bounded output/input overflow', async () => {
    const utxo = box();
    await expect(setup([utxo, utxo]).generate(order(60_000n))).rejects.toThrow(
      'Duplicate',
    );
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
      expect(await chain.verifyPaymentTransaction(edited)).toBe(false);
      expect(
        chain.verifyTransactionExtraConditions(edited, SigningStatus.UnSigned),
      ).toBe(false);
    },
  );
  it('calls mediator with exact ForkID digest and independently verifies returned signature', async () => {
    const { chain, generate, mediator } = setup();
    const tx = await generate();
    const signed = await chain.signTransaction(tx);
    expect(mediator.sign).toHaveBeenCalledWith(
      getBchSigningDigest(tx.txBytes, tx.prevouts, treasuryScript, 0),
    );
    expect(signed.isSigned()).toBe(true);
    expect(signed.txId).toBe(tx.txId);
    expect(signed.getActualTxId()).not.toBe(tx.txId);
    expect(
      chain.PaymentTransactionFromJson(signed.toJson()).getActualTxId(),
    ).toBe(signed.getActualTxId());
  });
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
  it('checks signing state and current network UTXOs before signing or submitting', async () => {
    const { chain, generate, mediator, network, current } = setup();
    const tx = await generate();
    await expect(chain.submitTransaction(tx)).rejects.toThrow('signing state');
    const signed = await chain.signTransaction(tx);
    await expect(chain.signTransaction(signed)).rejects.toThrow(
      'signing state',
    );
    current.clear();
    await expect(chain.submitTransaction(signed)).rejects.toThrow(
      'invalid treasury',
    );
    await expect(chain.signTransaction(tx)).rejects.toThrow('invalid treasury');
    expect(mediator.sign).toHaveBeenCalledTimes(1);
    expect(network.submitTransaction).not.toHaveBeenCalled();
    expect(
      (await chain.isTxValid(tx, SigningStatus.UnSigned)).details?.unexpected,
    ).toBe(true);
  });
  it('submits only a verified signed envelope, and queries only signed chain ID', async () => {
    const { chain, generate, network } = setup();
    const signed = await chain.signTransaction(await generate());
    await chain.submitTransaction(signed);
    expect(network.submitTransaction).toHaveBeenCalledTimes(1);
    expect(network.submitTransaction.mock.calls[0][0].toJson()).toBe(
      signed.toJson(),
    );
    expect(await chain.getActualTxId(signed.txId, signed)).toBe(
      signed.getActualTxId(),
    );
    expect(
      await chain.getTxConfirmationStatus(
        signed.txId,
        TransactionType.payment,
        signed,
      ),
    ).toBe(ConfirmationStatus.ConfirmedEnough);
    await chain.isTxInMempool(signed.txId, signed);
    expect(network.getTxConfirmation).toHaveBeenCalledWith(
      signed.getActualTxId(),
    );
    expect(network.isTxInMempool).toHaveBeenCalledWith(signed.getActualTxId());
    await expect(chain.getActualTxId(signed.txId)).rejects.toThrow('persisted');
  });
  it('restores matching signed body from persisted unsigned context without using approval hash as chain ID', async () => {
    const { chain, generate, network, current } = setup();
    const tx = await generate();
    const signed = await chain.signTransaction(tx);
    current.clear();
    network.findSignedTransaction.mockResolvedValue(signed.txBytes);
    expect(await chain.getActualTxId(tx.txId, tx)).toBe(signed.getActualTxId());
    expect((await chain.getRecoveredTransaction(tx))?.toJson()).toBe(
      signed.toJson(),
    );
  });
  it('retains an already signed envelope during recovery without scanning wallet history', async () => {
    const { chain, generate, network } = setup();
    const signed = await chain.signTransaction(await generate());
    expect((await chain.getRecoveredTransaction(signed))?.toJson()).toBe(
      signed.toJson(),
    );
    expect(network.findSignedTransaction).not.toHaveBeenCalled();
  });
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
    expect(signed.isSigned()).toBe(true);
  });
  it('imports bounded raw transactions only with current authenticated parents', async () => {
    const { chain, generate, current } = setup();
    const tx = await generate();
    expect(
      (await chain.rawTxToPaymentTransaction(tx.getTxHexString())).txId,
    ).toBe(tx.txId);
    current.clear();
    await expect(
      chain.rawTxToPaymentTransaction(tx.getTxHexString()),
    ).rejects.toThrow('unavailable');
  });
  it('rejects mutated envelopes and foreign transaction shapes in token-free checks', async () => {
    const { chain, generate } = setup();
    const tx = await generate();
    expect(await chain.verifyNoTokenBurned(tx)).toBe(true);
    tx.txId = '00'.repeat(32);
    expect(await chain.verifyNoTokenBurned(tx)).toBe(false);
    expect(
      await chain.verifyPaymentTransaction({ ...tx } as BitcoinCashTransaction),
    ).toBe(false);
  });
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
    ).toBe(true);
    raw.outputs[0] = {
      ...raw.outputs[0],
      token: { category: new Uint8Array(32).fill(1), amount: 1n },
    } as (typeof raw.outputs)[0];
    const tokenBytes = encodeTransactionBCH(raw);
    expect(
      await chain.verifyLockTransactionExtraConditions(
        { ...tx, txid: hashTransaction(tokenBytes), hex: binToHex(tokenBytes) },
        { hash: '', parentHash: '', height: 1 },
      ),
    ).toBe(false);
  });
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
