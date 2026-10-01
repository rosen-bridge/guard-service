import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { MinimumFeeBox } from '@rosen-bridge/minimum-fee';
import { TokenMap } from '@rosen-bridge/tokens';
import { EventTrigger } from '@rosen-chains/abstract-chain';

import { DatabaseAction } from '../../src/db/databaseAction';
import EventOrder from '../../src/event/eventOrder';
import EventProcessor from '../../src/event/eventProcessor';
import EventSerializer from '../../src/event/eventSerializer';
import MinimumFeeHandler from '../../src/handlers/minimumFeeHandler';
import { TokenHandler } from '../../src/handlers/tokenHandler';
import EventVerifier from '../../src/verification/eventVerifier';
import { bchTokenSet } from '../configs/bitcoinCashFixtures';

const wrapped = '56'.repeat(32);
const event = (changes: Partial<EventTrigger> = {}): EventTrigger => ({
  height: 99999,
  fromChain: 'bitcoin-cash',
  toChain: 'ergo',
  fromAddress: 'box:' + '11'.repeat(32) + '.0',
  toAddress: 'receiver',
  amount: '1000000',
  bridgeFee: '3',
  networkFee: '4',
  sourceChainTokenId: 'bch',
  targetChainTokenId: wrapped,
  sourceTxId: '22'.repeat(32),
  sourceChainHeight: 101,
  sourceBlockId: '33'.repeat(32),
  WIDsHash: '44'.repeat(32),
  WIDsCount: 1,
  ...changes,
});

// Decode boundary is supplied; selection, register interpretation and fee lookup are real.
const feeBox = async (chains = ['bitcoin-cash', 'ergo']) => {
  const values = {
    R4: chains.map((chain) => [...Buffer.from(chain)]),
    R5: [
      [100, 200],
      [150, 300],
    ],
    R6: [
      ['31', '11'],
      ['32', '12'],
    ],
    R7: [
      ['41', '21'],
      ['42', '22'],
    ],
    R8: [
      [
        ['1', '100'],
        ['2', '100'],
      ],
      [
        ['3', '100'],
        ['4', '100'],
      ],
    ],
    R9: [
      ['0', '0'],
      ['0', '0'],
    ],
  };
  const box = {
    boxId: 'fee-box',
    assets: [{ tokenId: 'nft' }, { tokenId: wrapped }],
    additionalRegisters: Object.fromEntries(
      Object.entries(values).map(([key, value]) => [
        key,
        JSON.stringify(value),
      ]),
    ),
  };
  const fees = new MinimumFeeBox(
    wrapped,
    'nft',
    {
      getBoxesByTokenId: async () => [box],
    } as unknown as ConstructorParameters<typeof MinimumFeeBox>[2],
    JSON.parse,
  );
  expect(await fees.fetchBox()).toBe(true);
  return fees;
};

describe('BCH fee producer-consumer contract', () => {
  let tokens: TokenMap;
  afterEach(() => vi.restoreAllMocks());
  beforeEach(async () => {
    tokens = new TokenMap();
    const config = bchTokenSet();
    config[0].ergo.decimals = 6;
    await tokens.updateConfigByJson(config);
    vi.spyOn(TokenHandler, 'getInstance').mockReturnValue({
      getTokenMap: () => tokens,
    } as TokenHandler);
    const fees = await feeBox();
    const lookup = vi.fn((tokenId: string) => {
      if (tokenId !== wrapped) throw Error('Wrong source token join');
      return fees;
    });
    vi.spyOn(MinimumFeeHandler, 'getInstance').mockReturnValue({
      getMinimumFeeBoxObject: lookup,
    } as unknown as MinimumFeeHandler);
  });

  it('joins source BCH token to Ergo fee box and selects Ergo target fees at source height', () => {
    const fees = MinimumFeeHandler.getEventFeeConfig(event());
    expect(fees.bridgeFee).toBe(11n);
    expect(fees.networkFee).toBe(21n);
  });
  it('selects BCH target fees using Ergo source height, independently of trigger height', () => {
    const fees = MinimumFeeHandler.getEventFeeConfig(
      event({
        fromChain: 'ergo',
        toChain: 'bitcoin-cash',
        sourceChainTokenId: wrapped,
        targetChainTokenId: 'bch',
        sourceChainHeight: 301,
      }),
    );
    expect(fees.bridgeFee).toBe(32n);
    expect(fees.networkFee).toBe(42n);
  });
  it('does not activate a fee row at its exact threshold', () => {
    expect(
      MinimumFeeHandler.getEventFeeConfig(event({ sourceChainHeight: 150 }))
        .bridgeFee,
    ).toBe(11n);
    expect(
      MinimumFeeHandler.getEventFeeConfig(event({ sourceChainHeight: 151 }))
        .bridgeFee,
    ).toBe(12n);
  });
  it('rejects source height at the first threshold despite a later Ergo trigger', () => {
    expect(() =>
      MinimumFeeHandler.getEventFeeConfig(event({ sourceChainHeight: 100 })),
    ).toThrow('does not support height');
  });
  it('rejects an absent source-token mapping', () => {
    expect(() =>
      MinimumFeeHandler.getEventFeeConfig(
        event({ sourceChainTokenId: 'missing' }),
      ),
    ).toThrow();
  });
  it('rejects absent target chain fee entry rather than falling back to source', () => {
    expect(() =>
      MinimumFeeHandler.getEventFeeConfig(event({ toChain: 'bitcoin' })),
    ).toThrow('not supported');
  });
  it('requires exact bitcoin-cash R4 source namespace', async () => {
    const fees = await feeBox(['bitcoinCash', 'ergo']);
    expect(() => fees.getFee('bitcoin-cash', 101, 'ergo')).toThrow(
      'No fee found for chain',
    );
  });
  it('requires exact bitcoin-cash R4 target namespace', async () => {
    const fees = await feeBox(['bitcoinCash', 'ergo']);
    expect(() => fees.getFee('ergo', 201, 'bitcoin-cash')).toThrow(
      'not supported',
    );
  });
  it('converts BCH8 to wrapped6 with ceiling and restores whole wrapped units to native satoshis', () => {
    expect(tokens.wrapAmount('bch', 100000001n, 'bitcoin-cash')).toEqual({
      amount: 1000001n,
      decimals: 6,
    });
    expect(tokens.unwrapAmount('bch', 1000001n, 'bitcoin-cash')).toEqual({
      amount: 100000100n,
      decimals: 8,
    });
  });
  it('subtracts declared and minimum fee values in Rosen units before native BCH8 conversion', () => {
    const fees = MinimumFeeHandler.getEventFeeConfig(
      event({
        fromChain: 'ergo',
        toChain: 'bitcoin-cash',
        sourceChainTokenId: wrapped,
        targetChainTokenId: 'bch',
        sourceChainHeight: 301,
      }),
    );
    const payment = EventOrder.eventSinglePayment(
      event({
        toChain: 'bitcoin-cash',
        targetChainTokenId: 'bch',
        bridgeFee: '50',
        networkFee: '60',
      }),
      6n,
      fees,
    );
    expect(payment.assets).toEqual({ nativeToken: 999896n, tokens: [] });
    expect(
      tokens.unwrapAmount('bch', payment.assets.nativeToken, 'bitcoin-cash')
        .amount,
    ).toBe(99989600n);
  });
  it('fails closed when payment target token is not mapped', () => {
    const fees = MinimumFeeHandler.getEventFeeConfig(event());
    expect(() =>
      EventOrder.eventSinglePayment(
        event({ toChain: 'bitcoin-cash', targetChainTokenId: 'missing' }),
        6n,
        fees,
      ),
    ).toThrow();
  });
  it('verifies a BCH trigger independently when Bitcoin shares its source txid', async () => {
    const bch = {
      ...event(),
      id: 2,
      eventId: EventSerializer.getRequestId(event()),
      txId: 'bch-trigger',
    };
    const bitcoin = {
      id: EventSerializer.getId(event({ fromChain: 'bitcoin' })),
      eventData: {
        ...event({ fromChain: 'bitcoin' }),
        id: 1,
        txId: 'bitcoin-trigger',
      },
    };
    const db = {
      getUnconfirmedEvents: vi.fn(async () => [bch]),
      getEventById: vi.fn(async (id: string) =>
        id === bitcoin.id ? bitcoin : null,
      ),
      insertRejectedEvent: vi.fn(),
      insertConfirmedEvent: vi.fn(),
    };
    vi.spyOn(DatabaseAction, 'getInstance').mockReturnValue(
      db as unknown as DatabaseAction,
    );
    vi.spyOn(EventVerifier, 'isEventConfirmedEnough').mockResolvedValue(true);
    const verify = vi
      .spyOn(EventVerifier, 'verifyEvent')
      .mockResolvedValue(true);
    await EventProcessor.processScannedEvents();
    expect(db.getEventById).toHaveBeenCalledWith(
      EventSerializer.getId(event()),
    );
    expect(db.insertRejectedEvent).not.toHaveBeenCalled();
    expect(db.insertConfirmedEvent).toHaveBeenCalledWith(bch);
    expect(verify).toHaveBeenCalledWith(bch, bch.txId, expect.anything());
  });
});
