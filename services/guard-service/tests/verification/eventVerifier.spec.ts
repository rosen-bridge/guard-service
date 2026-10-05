import {
  encodeTransactionBCH as bchEventContract_encodeTransactionBCH,
  hashTransaction as bchEventContract_hashTransaction,
  hexToBin as bchEventContract_hexToBin,
} from '@bitauth/libauth';
import * as bchEventContract_wasm from 'ergo-lib-wasm-nodejs';

import {
  decodeAddress as bchEventContract_decodeAddress,
  encodeAddress as bchEventContract_encodeAddress,
  validateAddress as bchEventContract_validateAddress,
} from '@rosen-bridge/address-codec';
import { AddressManager as bchEventContract_AddressManager } from '@rosen-bridge/address-manager';
import { ChainMinimumFee } from '@rosen-bridge/minimum-fee';
import { ChainMinimumFee as bchEventContract_ChainMinimumFee } from '@rosen-bridge/minimum-fee';
import { BitcoinCashRpcRosenExtractor as bchEventContract_BitcoinCashRpcRosenExtractor } from '@rosen-bridge/rosen-extractor/dist/bitcoinCash.js';
import { TokenMap as bchEventContract_TokenMap } from '@rosen-bridge/tokens';
import {
  ConfirmationStatus,
  TransactionType,
} from '@rosen-chains/abstract-chain';
import { EventTrigger as bchEventContract_EventTrigger } from '@rosen-chains/abstract-chain';
import { BitcoinCashChain as bchEventContract_BitcoinCashChain } from '@rosen-chains/bitcoin-cash';
import { ErgoChain as bchEventContract_ErgoChain } from '@rosen-chains/ergo';

import GuardsErgoConfigs from '../../src/configs/guardsErgoConfigs';
import { ConfirmedEventEntity } from '../../src/db/entities/confirmedEventEntity';
import bchEventContract_EventBoxes from '../../src/event/eventBoxes';
import bchEventContract_ChainHandler from '../../src/handlers/chainHandler';
import { EventStatus } from '../../src/utils/constants';
import EventVerifier from '../../src/verification/eventVerifier';
import bchEventContract_EventVerifier from '../../src/verification/eventVerifier';
import {
  bchPublicKey as bchEventContract_bchPublicKey,
  ergoAddress as bchEventContract_ergoAddress,
} from '../configs/bitcoinCashTestData';
import {
  bchLock as bchEventContract_bchLock,
  bchTokenSet as bchEventContract_bchTokenSet,
} from '../configs/bitcoinCashTestUtils';
import DatabaseActionMock from '../db/mocked/databaseAction.mock';
import { mockEventTrigger } from '../event/testData';
import ChainHandlerMock from '../handlers/chainHandler.mock';
import { preserveBitcoinCashMocks } from '../testUtils/mocked/bitcoinCashMockScope.mock';

describe('EventVerifier', () => {
  describe('isEventConfirmedEnough', () => {
    beforeEach(async () => {
      ChainHandlerMock.resetMock();
    });

    /**
     * @target EventVerifier.isEventConfirmedEnough should return true when
     * event box and source tx are both confirmed
     * @dependencies
     * - ChainHandler
     * @scenario
     * - mock ChainHandler
     *   - mock Ergo `getHeight` such that event box is confirmed
     *   - mock fromChain `getTxConfirmationStatus` such that event source tx is confirmed
     * - run test
     * - verify returned value
     * @expected
     * - returned value should be true
     */
    it('should return true when event box and source tx are both confirmed', async () => {
      const mockedEvent = mockEventTrigger().event;

      // mock ChainHandler
      const fromChain = mockedEvent.fromChain;
      ChainHandlerMock.mockChainName(fromChain);
      // mock Ergo `getHeight` such that event box is confirmed
      ChainHandlerMock.mockErgoFunctionReturnValue(
        'getHeight',
        mockedEvent.height + GuardsErgoConfigs.eventConfirmation,
        true,
      );
      // mock fromChain `getTxConfirmationStatus` such that event source tx is confirmed
      ChainHandlerMock.mockChainFunction(
        fromChain,
        'getTxConfirmationStatus',
        ConfirmationStatus.ConfirmedEnough,
        true,
      );

      // run test
      const result = await EventVerifier.isEventConfirmedEnough(mockedEvent);

      // verify returned value
      expect(result).toEqual(true);
    });

    /**
     * @target EventVerifier.isEventConfirmedEnough should return false when
     * event box is unconfirmed
     * @dependencies
     * - ChainHandler
     * @scenario
     * - mock Ergo `getHeight` such that box is unconfirmed
     * - run test
     * - verify returned value
     * @expected
     * - returned value should be false
     */
    it('should return true when event box is unconfirmed', async () => {
      const mockedEvent = mockEventTrigger().event;

      // mock Ergo `getHeight` such that event box is confirmed
      ChainHandlerMock.mockErgoFunctionReturnValue(
        'getHeight',
        mockedEvent.height + GuardsErgoConfigs.eventConfirmation - 1,
        true,
      );

      // run test
      const result = await EventVerifier.isEventConfirmedEnough(mockedEvent);

      // verify returned value
      expect(result).toEqual(false);
    });

    /**
     * @target EventVerifier.isEventConfirmedEnough should return false when
     * source tx is unconfirmed
     * @dependencies
     * - ChainHandler
     * @scenario
     * - mock ChainHandler
     *   - mock Ergo `getHeight` such that event box is confirmed
     *   - mock fromChain `getTxConfirmationStatus` such that event source tx is unconfirmed
     * - run test
     * - verify returned value
     * @expected
     * - returned value should be false
     */
    it('should return false when source tx is unconfirmed', async () => {
      const mockedEvent = mockEventTrigger().event;

      // mock ChainHandler
      const fromChain = mockedEvent.fromChain;
      ChainHandlerMock.mockChainName(fromChain);
      // mock Ergo `getHeight` such that event box is confirmed
      ChainHandlerMock.mockErgoFunctionReturnValue(
        'getHeight',
        mockedEvent.height + GuardsErgoConfigs.eventConfirmation,
        true,
      );
      // mock fromChain `getTxConfirmationStatus` such that event source tx is unconfirmed
      ChainHandlerMock.mockChainFunction(
        fromChain,
        'getTxConfirmationStatus',
        ConfirmationStatus.NotConfirmedEnough,
        true,
      );

      // run test
      const result = await EventVerifier.isEventConfirmedEnough(mockedEvent);

      // verify returned value
      expect(result).toEqual(false);
    });
  });

  describe('verifyEvent', () => {
    const eventTxId = 'event-creation-tx-id';
    const fee: ChainMinimumFee = {
      bridgeFee: 0n,
      networkFee: 0n,
      rsnRatio: 0n,
      feeRatio: 0n,
      rsnRatioDivisor: 1000000000000n,
      feeRatioDivisor: 1000n,
    };

    beforeEach(async () => {
      await DatabaseActionMock.clearTables();
      ChainHandlerMock.resetMock();
    });

    /**
     * @target EventVerifier.verifyEvent should verify event successfully
     * @dependencies
     * - database
     * - ChainHandler
     * @scenario
     * - insert a mocked event into db
     * - mock ChainHandler `fromChain` and `getErgoChain`
     *   - mock `verifyEvent` to return true
     *   - mock `verifyEventRWT` to return true
     *   - mock `getRWTToken` of Ergo
     * - run test
     * - verify returned value
     * @expected
     * - returned value should be true
     */
    it('should verify event successfully', async () => {
      // insert a mocked event into db
      const mockedEvent = mockEventTrigger().event;
      const boxSerialized = 'boxSerialized';
      await DatabaseActionMock.insertEventRecord(mockedEvent, boxSerialized);

      // mock ChainHandler
      const fromChain = mockedEvent.fromChain;
      ChainHandlerMock.mockChainName(fromChain);
      // mock fromChain `verifyEvent`
      ChainHandlerMock.mockChainFunction(fromChain, 'verifyEvent', true, true);
      // mock fromChain `verifyEventRWT`
      ChainHandlerMock.mockErgoFunctionReturnValue('verifyEventRWT', true);
      // mock fromChain `getRWTToken`
      ChainHandlerMock.mockChainFunction(fromChain, 'getRWTToken', 'rwt');

      // run test
      const result = await EventVerifier.verifyEvent(
        mockedEvent,
        eventTxId,
        fee,
      );

      // verify returned value
      expect(result).toEqual(true);
    });

    /**
     * @target EventVerifier.verifyEvent should return false
     * when event does not verify
     * @dependencies
     * - database
     * - ChainHandler
     * @scenario
     * - insert a mocked event into db
     * - mock ChainHandler `fromChain` and `getErgoChain`
     *   - mock `verifyEvent` to return false
     *   - mock `verifyEventRWT` to return true
     *   - mock `getRWTToken` of Ergo
     * - run test
     * - verify returned value
     * @expected
     * - returned value should be false
     */
    it('should return false when event does not verify', async () => {
      // insert a mocked event into db
      const mockedEvent = mockEventTrigger().event;
      const boxSerialized = 'boxSerialized';
      await DatabaseActionMock.insertEventRecord(mockedEvent, boxSerialized);

      // mock ChainHandler
      const fromChain = mockedEvent.fromChain;
      ChainHandlerMock.mockChainName(fromChain);
      // mock fromChain `verifyEvent`
      ChainHandlerMock.mockChainFunction(fromChain, 'verifyEvent', false, true);
      // mock fromChain `verifyEventRWT`
      ChainHandlerMock.mockErgoFunctionReturnValue('verifyEventRWT', true);
      // mock fromChain `getRWTToken`
      ChainHandlerMock.mockChainFunction(fromChain, 'getRWTToken', 'rwt');

      // run test
      const result = await EventVerifier.verifyEvent(
        mockedEvent,
        eventTxId,
        fee,
      );

      // verify returned value
      expect(result).toEqual(false);
    });

    /**
     * @target EventVerifier.verifyEvent should return false
     * when event RWT is wrong
     * @dependencies
     * - database
     * - ChainHandler
     * @scenario
     * - insert a mocked event into db
     * - mock ChainHandler `fromChain` and `getErgoChain`
     *   - mock `verifyEvent` to return true
     *   - mock `verifyEventRWT` to return false
     *   - mock `getRWTToken` of Ergo
     * - run test
     * - verify returned value
     * @expected
     * - returned value should be false
     */
    it('should return false when event RWT is wrong', async () => {
      // insert a mocked event into db
      const mockedEvent = mockEventTrigger().event;
      const boxSerialized = 'boxSerialized';
      await DatabaseActionMock.insertEventRecord(mockedEvent, boxSerialized);

      // mock ChainHandler
      const fromChain = mockedEvent.fromChain;
      ChainHandlerMock.mockChainName(fromChain);
      // mock fromChain `verifyEvent`
      ChainHandlerMock.mockChainFunction(fromChain, 'verifyEvent', true, true);
      // mock fromChain `verifyEventRWT`
      ChainHandlerMock.mockErgoFunctionReturnValue('verifyEventRWT', false);
      // mock fromChain `getRWTToken`
      ChainHandlerMock.mockChainFunction(fromChain, 'getRWTToken', 'rwt');

      // run test
      const result = await EventVerifier.verifyEvent(
        mockedEvent,
        eventTxId,
        fee,
      );

      // verify returned value
      expect(result).toEqual(false);
    });

    describe('BCH RCS bitcoinCashEventContract', () => {
      let restoreBchMocks: () => void;
      beforeEach(() => {
        restoreBchMocks = preserveBitcoinCashMocks([
          [bchEventContract_ChainHandler, ['getInstance']],
          [bchEventContract_EventBoxes, ['getEventBox']],
        ]);
      });
      afterEach(() => restoreBchMocks());

      let source: bchEventContract_BitcoinCashChain;
      let ergo: bchEventContract_ErgoChain;
      let tokens: bchEventContract_TokenMap;
      let event: bchEventContract_EventTrigger;
      let deposit: ReturnType<typeof bchEventContract_rawDeposit>;
      let network: {
        getBlockTransactionIds: ReturnType<typeof vi.fn>;
        getTransaction: ReturnType<typeof vi.fn>;
        getBlockInfo: ReturnType<typeof vi.fn>;
      };
      beforeEach(async () => {
        bchEventContract_AddressManager.init(
          {
            /** Provide the ergo test seam for the current scenario without external requests. */
            ergo: (address) =>
              bchEventContract_validateAddress('ergo', address),
          },
          {
            /** Provide the ergo test seam for the current scenario without external requests. */
            ergo: (address) => bchEventContract_decodeAddress('ergo', address),
          },
        );
        tokens = new bchEventContract_TokenMap();
        const config = bchEventContract_bchTokenSet();
        config[0].ergo.decimals = 6;
        await tokens.updateConfigByJson(config);
        deposit = bchEventContract_rawDeposit();
        network = {
          /** Provide the getBlockTransactionIds test seam for the current scenario without external requests. */
          getBlockTransactionIds: vi.fn(async () => [deposit.txid]),
          /** Provide the getTransaction test seam for the current scenario without external requests. */
          getTransaction: vi.fn(async () => deposit),
          /** Provide the getBlockInfo test seam for the current scenario without external requests. */
          getBlockInfo: vi.fn(async () => ({
            hash: bchEventContract_sourceBlockId,
            height: 101,
          })),
        };
        source = new bchEventContract_BitcoinCashChain(
          network as unknown as ConstructorParameters<
            typeof bchEventContract_BitcoinCashChain
          >[0],
          {
            aggregatedPublicKey: bchEventContract_bchPublicKey,
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
              lock: bchEventContract_bchLock,
              cold: bchEventContract_bchLock,
              permit: bchEventContract_ergoAddress,
              fraud: bchEventContract_ergoAddress,
            },
            rwtId: bchEventContract_rwt,
          },
          tokens,
          {} as ConstructorParameters<
            typeof bchEventContract_BitcoinCashChain
          >[3],
        );
        ergo = new bchEventContract_ErgoChain(
          {} as ConstructorParameters<typeof bchEventContract_ErgoChain>[0],
          {
            addresses: { lock: bchEventContract_ergoAddress },
            fee: 1000000n,
          } as ConstructorParameters<typeof bchEventContract_ErgoChain>[1],
          tokens,
          {} as ConstructorParameters<typeof bchEventContract_ErgoChain>[3],
        );
        vi.spyOn(bchEventContract_ChainHandler, 'getInstance').mockReturnValue({
          /** Provide the getChain test seam for the current scenario without external requests. */
          getChain: (chain: string) => {
            if (chain !== 'bitcoin-cash') throw Error('Foreign source chain');
            return source;
          },
          /** Provide the getErgoChain test seam for the current scenario without external requests. */
          getErgoChain: () => ergo,
        } as unknown as bchEventContract_ChainHandler);
        vi.spyOn(bchEventContract_EventBoxes, 'getEventBox').mockResolvedValue(
          bchEventContract_serializedEventBox(),
        );
        event = {
          height: 200,
          fromChain: 'bitcoin-cash',
          toChain: 'ergo',
          fromAddress: `box:${bchEventContract_sourceInput}.7`,
          toAddress: bchEventContract_ergoAddress,
          amount: '1234568',
          bridgeFee: '291',
          networkFee: '1110',
          sourceChainTokenId: 'bch',
          targetChainTokenId: '56'.repeat(32),
          sourceTxId: deposit.txid,
          sourceChainHeight: 101,
          sourceBlockId: bchEventContract_sourceBlockId,
          WIDsHash: '66'.repeat(32),
          WIDsCount: 1,
        };
      });

      /**
       * @target EventVerifier.verifyEvent - accepts authenticated BCH8 bytes
       * with wrapped6 amount, literal Rosen fees and BCH RWT
       * @dependencies Real BCH8/Ergo6 TokenMap, source chain/extractor and
       * Ergo RWT box; synthetic serialized deposits, mocked block/transaction
       * and minimum-fee seams.
       * @scenario accepts authenticated BCH8 bytes with wrapped6 amount,
       * literal Rosen fees and BCH RWT.
       * @expected Accept only the authenticated BCH source bytes, mapped
       * wrapped amount, literal Rosen fees and BCH RWT; reject each isolated
       * changed field or fee exhaustion.
       */
      it('accepts authenticated BCH8 bytes with wrapped6 amount, literal Rosen fees and BCH RWT', async () => {
        expect(
          new bchEventContract_BitcoinCashRpcRosenExtractor(
            bchEventContract_bchLock,
            tokens,
          ).get(deposit),
        ).toMatchObject({
          amount: event.amount,
          bridgeFee: event.bridgeFee,
          networkFee: event.networkFee,
          toAddress: event.toAddress,
        });
        expect(
          await bchEventContract_EventVerifier.verifyEvent(
            event,
            'trigger',
            bchEventContract_fees,
          ),
        ).toEqual(true);
        expect(network.getBlockTransactionIds).toHaveBeenCalledWith(
          bchEventContract_sourceBlockId,
        );
        expect(network.getTransaction).toHaveBeenCalledWith(
          deposit.txid,
          bchEventContract_sourceBlockId,
        );
      });
      /**
       * @target EventVerifier.verifyEvent - rejects a single changed %s
       * independently of the scanned event
       * @dependencies Real BCH8/Ergo6 TokenMap, source chain/extractor and
       * Ergo RWT box; synthetic serialized deposits, mocked block/transaction
       * and minimum-fee seams.
       * @scenario rejects a single changed %s independently of the scanned
       * event.
       * @expected Accept only the authenticated BCH source bytes, mapped
       * wrapped amount, literal Rosen fees and BCH RWT; reject each isolated
       * changed field or fee exhaustion.
       */
      it.each([
        ['wrapped amount', { amount: '1234567' }],
        ['bridge fee', { bridgeFee: '292' }],
        ['network fee', { networkFee: '1111' }],
        ['target token', { targetChainTokenId: '77'.repeat(32) }],
        ['source token', { sourceChainTokenId: 'btc' }],
        ['source height', { sourceChainHeight: 102 }],
        ['receiver', { toAddress: bchEventContract_bchLock }],
      ] as const)(
        'rejects a single changed %s independently of the scanned event',
        async (_name, changes) => {
          expect(
            await bchEventContract_EventVerifier.verifyEvent(
              { ...event, ...changes },
              'trigger',
              bchEventContract_fees,
            ),
          ).toEqual(false);
        },
      );
      /**
       * @target EventVerifier.verifyEvent - rejects a BCH source transaction
       * absent from its claimed source block
       * @dependencies Real BCH8/Ergo6 TokenMap, source chain/extractor and
       * Ergo RWT box; synthetic serialized deposits, mocked block/transaction
       * and minimum-fee seams.
       * @scenario rejects a BCH source transaction absent from its claimed
       * source block.
       * @expected Accept only the authenticated BCH source bytes, mapped
       * wrapped amount, literal Rosen fees and BCH RWT; reject each isolated
       * changed field or fee exhaustion.
       */
      it('rejects a BCH source transaction absent from its claimed source block', async () => {
        network.getBlockTransactionIds.mockResolvedValue([]);
        expect(
          await bchEventContract_EventVerifier.verifyEvent(
            event,
            'trigger',
            bchEventContract_fees,
          ),
        ).toEqual(false);
        expect(network.getTransaction).not.toHaveBeenCalled();
      });
      /**
       * @target EventVerifier.verifyEvent - rejects a mismatched raw/RPC
       * output value
       * @dependencies Real BCH8/Ergo6 TokenMap, source chain/extractor and
       * Ergo RWT box; synthetic serialized deposits, mocked block/transaction
       * and minimum-fee seams.
       * @scenario rejects a mismatched raw/RPC output value.
       * @expected Accept only the authenticated BCH source bytes, mapped
       * wrapped amount, literal Rosen fees and BCH RWT; reject each isolated
       * changed field or fee exhaustion.
       */
      it('rejects a mismatched raw/RPC output value', async () => {
        deposit.vout[0].value = '1.23456788';
        expect(
          await bchEventContract_EventVerifier.verifyEvent(
            event,
            'trigger',
            bchEventContract_fees,
          ),
        ).toEqual(false);
      });
      /**
       * @target EventVerifier.verifyEvent - rejects missing BCH mapping before
       * accepting wrapped amount
       * @dependencies Real BCH8/Ergo6 TokenMap, source chain/extractor and
       * Ergo RWT box; synthetic serialized deposits, mocked block/transaction
       * and minimum-fee seams.
       * @scenario rejects missing BCH mapping before accepting wrapped amount.
       * @expected Accept only the authenticated BCH source bytes, mapped
       * wrapped amount, literal Rosen fees and BCH RWT; reject each isolated
       * changed field or fee exhaustion.
       */
      it('rejects missing BCH mapping before accepting wrapped amount', async () => {
        await tokens.updateConfigByJson([]);
        expect(
          await bchEventContract_EventVerifier.verifyEvent(
            event,
            'trigger',
            bchEventContract_fees,
          ),
        ).toEqual(false);
      });
      /**
       * @target EventVerifier.verifyEvent - rejects when current target
       * minimum fees consume the entire wrapped amount
       * @dependencies Real BCH8/Ergo6 TokenMap, source chain/extractor and
       * Ergo RWT box; synthetic serialized deposits, mocked block/transaction
       * and minimum-fee seams.
       * @scenario rejects when current target minimum fees consume the entire
       * wrapped amount.
       * @expected Accept only the authenticated BCH source bytes, mapped
       * wrapped amount, literal Rosen fees and BCH RWT; reject each isolated
       * changed field or fee exhaustion.
       */
      it('rejects when current target minimum fees consume the entire wrapped amount', async () => {
        const excessive = new bchEventContract_ChainMinimumFee({
          bridgeFee: 1233458n,
          networkFee: 1110n,
          feeRatio: 0n,
          rsnRatio: 0n,
          rsnRatioDivisor: 100n,
        });
        expect(
          await bchEventContract_EventVerifier.verifyEvent(
            event,
            'trigger',
            excessive,
          ),
        ).toEqual(false);
      });
      /**
       * @target EventVerifier.verifyEvent - rejects a Bitcoin RWT even when
       * BCH source transaction verifies
       * @dependencies Real BCH8/Ergo6 TokenMap, source chain/extractor and
       * Ergo RWT box; synthetic serialized deposits, mocked block/transaction
       * and minimum-fee seams.
       * @scenario rejects a Bitcoin RWT even when BCH source transaction
       * verifies.
       * @expected Accept only the authenticated BCH source bytes, mapped
       * wrapped amount, literal Rosen fees and BCH RWT; reject each isolated
       * changed field or fee exhaustion.
       */
      it('rejects a Bitcoin RWT even when BCH source transaction verifies', async () => {
        vi.mocked(bchEventContract_EventBoxes.getEventBox).mockResolvedValue(
          bchEventContract_serializedEventBox('99'.repeat(32)),
        );
        expect(await source.verifyEvent(event, bchEventContract_fees)).toEqual(
          true,
        );
        expect(
          await bchEventContract_EventVerifier.verifyEvent(
            event,
            'trigger',
            bchEventContract_fees,
          ),
        ).toEqual(false);
      });
      /**
       * @target EventVerifier.verifyEvent - rejects when target minimum
       * network fee alone consumes the remaining wrapped amount
       * @dependencies Real BCH8/Ergo6 TokenMap, source chain/extractor and
       * Ergo RWT box; synthetic serialized deposits, mocked block/transaction
       * and minimum-fee seams.
       * @scenario rejects when target minimum network fee alone consumes the
       * remaining wrapped amount.
       * @expected Accept only the authenticated BCH source bytes, mapped
       * wrapped amount, literal Rosen fees and BCH RWT; reject each isolated
       * changed field or fee exhaustion.
       */
      it('rejects when target minimum network fee alone consumes the remaining wrapped amount', async () => {
        const excessive = new bchEventContract_ChainMinimumFee({
          bridgeFee: 10n,
          networkFee: 1234277n,
          feeRatio: 0n,
          rsnRatio: 0n,
          rsnRatioDivisor: 100n,
        });
        expect(
          await bchEventContract_EventVerifier.verifyEvent(
            event,
            'trigger',
            excessive,
          ),
        ).toEqual(false);
      });
      /**
       * @target EventVerifier.verifyEvent - rejects when the proportional
       * bridge fee consumes the wrapped amount
       * @dependencies Real BCH8/Ergo6 TokenMap, source chain/extractor and
       * Ergo RWT box; synthetic serialized deposits, mocked block/transaction
       * and minimum-fee seams.
       * @scenario rejects when the proportional bridge fee consumes the
       * wrapped amount.
       * @expected Accept only the authenticated BCH source bytes, mapped
       * wrapped amount, literal Rosen fees and BCH RWT; reject each isolated
       * changed field or fee exhaustion.
       */
      it('rejects when the proportional bridge fee consumes the wrapped amount', async () => {
        const excessive = new bchEventContract_ChainMinimumFee({
          bridgeFee: 10n,
          networkFee: 20n,
          feeRatio: bchEventContract_fees.feeRatioDivisor,
          rsnRatio: 0n,
          rsnRatioDivisor: 100n,
        });
        expect(
          await bchEventContract_EventVerifier.verifyEvent(
            event,
            'trigger',
            excessive,
          ),
        ).toEqual(false);
      });
    });
  });

  describe('isEventPendingToType', () => {
    /**
     * @target EventVerifier.isEventPendingToType should return true when
     * type is payment and event status is pending-payment
     * @dependencies
     * @scenario
     * - mock an event
     * - run test
     * - verify returned value
     * @expected
     * - returned value should be true
     */
    it('should return true when type is payment and event status is pending-payment', async () => {
      // mock an event
      const mockedEvent = new ConfirmedEventEntity();
      mockedEvent.status = EventStatus.pendingPayment;

      // run test
      const result = EventVerifier.isEventPendingToType(
        mockedEvent,
        TransactionType.payment,
      );

      // verify returned value
      expect(result).toEqual(true);
    });

    /**
     * @target EventVerifier.isEventPendingToType should return true when
     * type is reward and event status is pending-reward
     * @dependencies
     * @scenario
     * - mock an event
     * - run test
     * - verify returned value
     * @expected
     * - returned value should be true
     */
    it('should return true when type is reward and event status is pending-reward', async () => {
      // mock an event
      const mockedEvent = new ConfirmedEventEntity();
      mockedEvent.status = EventStatus.pendingReward;

      // run test
      const result = EventVerifier.isEventPendingToType(
        mockedEvent,
        TransactionType.reward,
      );

      // verify returned value
      expect(result).toEqual(true);
    });

    /**
     * @target EventVerifier.isEventPendingToType should return false when
     * type and event status are not compatible
     * @dependencies
     * @scenario
     * - mock an event
     * - run test
     * - verify returned value
     * @expected
     * - returned value should be false
     */
    it('should return false when type and event status are not compatible', async () => {
      // mock an event
      const mockedEvent = new ConfirmedEventEntity();
      mockedEvent.status = EventStatus.timeout;

      // run test
      const result = EventVerifier.isEventPendingToType(
        mockedEvent,
        TransactionType.reward,
      );

      // verify returned value
      expect(result).toEqual(false);
    });
  });
});

const bchEventContract_rwt = '12'.repeat(32);
const bchEventContract_sourceBlockId = '34'.repeat(32);
const bchEventContract_sourceInput = '11'.repeat(32);
/** Provide the bchEventContract_rawDeposit test seam for the current scenario without external requests. */
const bchEventContract_rawDeposit = (satoshis = 123456789n) => {
  const lock = bchEventContract_encodeAddress(
    'bitcoin-cash',
    bchEventContract_bchLock,
  );
  const receiver = Buffer.from(
    bchEventContract_encodeAddress('ergo', bchEventContract_ergoAddress),
    'hex',
  );
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
    {
      lockingBytecode: bchEventContract_hexToBin(lock),
      valueSatoshis: satoshis,
    },
    { lockingBytecode: bchEventContract_hexToBin(opReturn), valueSatoshis: 0n },
  ];
  const bytes = bchEventContract_encodeTransactionBCH({
    version: 2,
    locktime: 0,
    inputs: [
      {
        outpointTransactionHash: bchEventContract_hexToBin(
          bchEventContract_sourceInput,
        ),
        outpointIndex: 7,
        sequenceNumber: 0xffffffff,
        unlockingBytecode: Uint8Array.of(0x51),
      },
    ],
    outputs,
  });
  return {
    hex: Buffer.from(bytes).toString('hex'),
    txid: bchEventContract_hashTransaction(bytes),
    vin: [{ txid: bchEventContract_sourceInput, vout: 7 }],
    vout: outputs.map((output, n) => ({
      n,
      value: `${output.valueSatoshis / 100000000n}.${(output.valueSatoshis % 100000000n).toString().padStart(8, '0')}`,
      scriptPubKey: {
        hex: Buffer.from(output.lockingBytecode).toString('hex'),
      },
    })),
  };
};
/** Provide the bchEventContract_serializedEventBox test seam for the current scenario without external requests. */
const bchEventContract_serializedEventBox = (token = bchEventContract_rwt) => {
  const box = bchEventContract_wasm.ErgoBox.from_json(
    JSON.stringify({
      value: '1000000',
      ergoTree: bchEventContract_wasm.Address.from_base58(
        bchEventContract_ergoAddress,
      )
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
const bchEventContract_fees = new bchEventContract_ChainMinimumFee({
  bridgeFee: 10n,
  networkFee: 20n,
  feeRatio: 0n,
  rsnRatio: 0n,
  rsnRatioDivisor: 100n,
});
