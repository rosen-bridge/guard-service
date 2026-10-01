import {
  encodeTransactionBCH,
  hashTransaction,
  hexToBin,
} from '@bitauth/libauth';
import * as wasm from 'ergo-lib-wasm-nodejs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  decodeAddress,
  encodeAddress,
  validateAddress,
} from '@rosen-bridge/address-codec';
import { AddressManager } from '@rosen-bridge/address-manager';
import { ChainMinimumFee } from '@rosen-bridge/minimum-fee';
import { BitcoinCashRpcRosenExtractor } from '@rosen-bridge/rosen-extractor';
import { TokenMap } from '@rosen-bridge/tokens';
import { EventTrigger } from '@rosen-chains/abstract-chain';
import { BitcoinCashChain } from '@rosen-chains/bitcoin-cash';
import { ErgoChain } from '@rosen-chains/ergo';

import EventBoxes from '../../src/event/eventBoxes';
import ChainHandler from '../../src/handlers/chainHandler';
import EventVerifier from '../../src/verification/eventVerifier';
import {
  bchLock,
  bchPublicKey,
  bchTokenSet,
  ergoAddress,
} from '../configs/bitcoinCashFixtures';

const rwt = '12'.repeat(32);
const sourceBlockId = '34'.repeat(32);
const sourceInput = '11'.repeat(32);
const rawDeposit = (satoshis = 123456789n) => {
  const lock = encodeAddress('bitcoin-cash', bchLock);
  const receiver = Buffer.from(encodeAddress('ergo', ergoAddress), 'hex');
  // Chain 0 (Ergo), bridgeFee 291 and networkFee 1110 are Rosen units.
  const payload = Buffer.concat([
    Buffer.from('0000000000000001230000000000000456', 'hex'),
    Buffer.of(receiver.length),
    receiver,
  ]);
  const opReturn =
    '6a' +
    payload.length.toString(16).padStart(2, '0') +
    payload.toString('hex');
  const outputs = [
    { lockingBytecode: hexToBin(lock), valueSatoshis: satoshis },
    { lockingBytecode: hexToBin(opReturn), valueSatoshis: 0n },
  ];
  const bytes = encodeTransactionBCH({
    version: 2,
    locktime: 0,
    inputs: [
      {
        outpointTransactionHash: hexToBin(sourceInput),
        outpointIndex: 7,
        sequenceNumber: 0xffffffff,
        unlockingBytecode: Uint8Array.of(0x51),
      },
    ],
    outputs,
  });
  return {
    hex: Buffer.from(bytes).toString('hex'),
    txid: hashTransaction(bytes),
    vin: [{ txid: sourceInput, vout: 7 }],
    vout: outputs.map((output, n) => ({
      n,
      value: `${output.valueSatoshis / 100000000n}.${(output.valueSatoshis % 100000000n).toString().padStart(8, '0')}`,
      scriptPubKey: {
        hex: Buffer.from(output.lockingBytecode).toString('hex'),
      },
    })),
  };
};
const serializedEventBox = (token = rwt) => {
  const box = wasm.ErgoBox.from_json(
    JSON.stringify({
      value: '1000000',
      ergoTree: wasm.Address.from_base58(ergoAddress)
        .to_ergo_tree()
        .to_base16_bytes(),
      creationHeight: 100,
      assets: [{ tokenId: token, amount: '1' }],
      additionalRegisters: {},
      transactionId: '55'.repeat(32),
      index: 0,
    }),
  );
  return Buffer.from(box.sigma_serialize_bytes()).toString('hex');
};
const fees = new ChainMinimumFee({
  bridgeFee: 10n,
  networkFee: 20n,
  feeRatio: 0n,
  rsnRatio: 0n,
  rsnRatioDivisor: 100n,
});

describe('BCH source transaction and Ergo RWT production join', () => {
  let source: BitcoinCashChain;
  let ergo: ErgoChain;
  let tokens: TokenMap;
  let event: EventTrigger;
  let deposit: ReturnType<typeof rawDeposit>;
  let network: {
    getBlockTransactionIds: ReturnType<typeof vi.fn>;
    getTransaction: ReturnType<typeof vi.fn>;
    getBlockInfo: ReturnType<typeof vi.fn>;
  };
  beforeEach(async () => {
    AddressManager.init(
      { ergo: (address) => validateAddress('ergo', address) },
      { ergo: (address) => decodeAddress('ergo', address) },
    );
    tokens = new TokenMap();
    const config = bchTokenSet();
    config[0].ergo.decimals = 6;
    await tokens.updateConfigByJson(config);
    deposit = rawDeposit();
    network = {
      getBlockTransactionIds: vi.fn(async () => [deposit.txid]),
      getTransaction: vi.fn(async () => deposit),
      getBlockInfo: vi.fn(async () => ({ hash: sourceBlockId, height: 101 })),
    };
    source = new BitcoinCashChain(
      network as unknown as ConstructorParameters<typeof BitcoinCashChain>[0],
      {
        aggregatedPublicKey: bchPublicKey,
        feeRate: 1,
        maxFee: 10000n,
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
        addresses: {
          lock: bchLock,
          cold: bchLock,
          permit: ergoAddress,
          fraud: ergoAddress,
        },
        rwtId: rwt,
      },
      tokens,
      {} as ConstructorParameters<typeof BitcoinCashChain>[3],
    );
    ergo = new ErgoChain(
      {} as ConstructorParameters<typeof ErgoChain>[0],
      {
        addresses: { lock: ergoAddress },
        fee: 1000000n,
      } as ConstructorParameters<typeof ErgoChain>[1],
      tokens,
      {} as ConstructorParameters<typeof ErgoChain>[3],
    );
    vi.spyOn(ChainHandler, 'getInstance').mockReturnValue({
      getChain: (chain: string) => {
        if (chain !== 'bitcoin-cash') throw Error('Foreign source chain');
        return source;
      },
      getErgoChain: () => ergo,
    } as unknown as ChainHandler);
    vi.spyOn(EventBoxes, 'getEventBox').mockResolvedValue(serializedEventBox());
    event = {
      height: 200,
      fromChain: 'bitcoin-cash',
      toChain: 'ergo',
      fromAddress: `box:${sourceInput}.7`,
      toAddress: ergoAddress,
      amount: '1234568',
      bridgeFee: '291',
      networkFee: '1110',
      sourceChainTokenId: 'bch',
      targetChainTokenId: '56'.repeat(32),
      sourceTxId: deposit.txid,
      sourceChainHeight: 101,
      sourceBlockId,
      WIDsHash: '66'.repeat(32),
      WIDsCount: 1,
    };
  });
  afterEach(() => vi.restoreAllMocks());

  it('accepts authenticated BCH8 bytes with wrapped6 amount, literal Rosen fees and BCH RWT', async () => {
    expect(
      new BitcoinCashRpcRosenExtractor(bchLock, tokens).get(deposit),
    ).toMatchObject({
      amount: event.amount,
      bridgeFee: event.bridgeFee,
      networkFee: event.networkFee,
      toAddress: event.toAddress,
    });
    expect(await EventVerifier.verifyEvent(event, 'trigger', fees)).toBe(true);
    expect(network.getBlockTransactionIds).toHaveBeenCalledWith(sourceBlockId);
    expect(network.getTransaction).toHaveBeenCalledWith(
      deposit.txid,
      sourceBlockId,
    );
  });
  it.each([
    ['wrapped amount', { amount: '1234567' }],
    ['bridge fee', { bridgeFee: '292' }],
    ['network fee', { networkFee: '1111' }],
    ['target token', { targetChainTokenId: '77'.repeat(32) }],
    ['source token', { sourceChainTokenId: 'btc' }],
    ['source height', { sourceChainHeight: 102 }],
    ['receiver', { toAddress: bchLock }],
  ] as const)(
    'rejects a single changed %s independently of the scanned event',
    async (_name, changes) => {
      expect(
        await EventVerifier.verifyEvent(
          { ...event, ...changes },
          'trigger',
          fees,
        ),
      ).toBe(false);
    },
  );
  it('rejects a BCH source transaction absent from its claimed source block', async () => {
    network.getBlockTransactionIds.mockResolvedValue([]);
    expect(await EventVerifier.verifyEvent(event, 'trigger', fees)).toBe(false);
    expect(network.getTransaction).not.toHaveBeenCalled();
  });
  it('rejects a mismatched raw/RPC output value', async () => {
    deposit.vout[0].value = '1.23456788';
    expect(await EventVerifier.verifyEvent(event, 'trigger', fees)).toBe(false);
  });
  it('rejects missing BCH mapping before accepting wrapped amount', async () => {
    await tokens.updateConfigByJson([]);
    expect(await EventVerifier.verifyEvent(event, 'trigger', fees)).toBe(false);
  });
  it('rejects when current target minimum fees consume the entire wrapped amount', async () => {
    const excessive = new ChainMinimumFee({
      bridgeFee: 1233458n,
      networkFee: 1110n,
      feeRatio: 0n,
      rsnRatio: 0n,
      rsnRatioDivisor: 100n,
    });
    expect(await EventVerifier.verifyEvent(event, 'trigger', excessive)).toBe(
      false,
    );
  });
  it('rejects a Bitcoin RWT even when BCH source transaction verifies', async () => {
    vi.mocked(EventBoxes.getEventBox).mockResolvedValue(
      serializedEventBox('99'.repeat(32)),
    );
    expect(await source.verifyEvent(event, fees)).toBe(true);
    expect(await EventVerifier.verifyEvent(event, 'trigger', fees)).toBe(false);
  });
  it('rejects when target minimum network fee alone consumes the remaining wrapped amount', async () => {
    const excessive = new ChainMinimumFee({
      bridgeFee: 10n,
      networkFee: 1234277n,
      feeRatio: 0n,
      rsnRatio: 0n,
      rsnRatioDivisor: 100n,
    });
    expect(await EventVerifier.verifyEvent(event, 'trigger', excessive)).toBe(
      false,
    );
  });
  it('rejects when the proportional bridge fee consumes the wrapped amount', async () => {
    const excessive = new ChainMinimumFee({
      bridgeFee: 10n,
      networkFee: 20n,
      feeRatio: fees.feeRatioDivisor,
      rsnRatio: 0n,
      rsnRatioDivisor: 100n,
    });
    expect(await EventVerifier.verifyEvent(event, 'trigger', excessive)).toBe(
      false,
    );
  });
});
