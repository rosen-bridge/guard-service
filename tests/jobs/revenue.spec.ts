import DatabaseActionMock from '../db/mocked/DatabaseAction.mock';
import { revenueJobFunction } from '../../src/jobs/revenue';
import ChainHandlerMock from '../handlers/ChainHandler.mock';
import { mockTokenPaymentEvent } from '../event/testData';
import TestUtils from '../testUtils/TestUtils';
import { ConfirmationStatus } from '@rosen-chains/abstract-chain';
import { RevenueType } from '../../src/utils/constants';
import * as testData from './testData';
import { ERG } from '@rosen-chains/ergo';
import GuardsCardanoConfigs from '../../src/configs/GuardsCardanoConfigs';
import { CARDANO_CHAIN } from '@rosen-chains/cardano';

describe('revenueJobFunction', () => {
  beforeEach(async () => {
    await DatabaseActionMock.clearTables();
    ChainHandlerMock.resetMock();
    ChainHandlerMock.mockErgoFunctionReturnValue('getHeight', 120);
    ChainHandlerMock.mockErgoFunctionReturnValue(
      'getTxRequiredConfirmation',
      15
    );
  });

  /**
   * @target revenueJobFunction should store fraud revenues successfully
   * @dependencies
   * - database
   * - ChainHandler
   * @scenario
   * - mock event with spendTxId and spendBlockId
   * - mock ChainHandler fromChain and ErgoChain
   *   - mock `getTransaction`
   *   - mock `extractSignedTransactionOrder`
   *   - mock `getChainConfigs`
   * - run test
   * - check database
   * @expected
   * - two revenues should be inserted with correct amount and type
   *   - Erg revenue
   *   - Token revenue
   */
  it('should store fraud revenues successfully', async () => {
    // mock event with spendTxId and spendBlockId
    const mockedEvent = mockTokenPaymentEvent();
    const spendTxId = TestUtils.generateRandomId();
    const spendBlockId = TestUtils.generateRandomId();
    const boxSerialized = 'boxSerialized';
    const tx = 'serialized-tx';

    // insert mocked event
    await DatabaseActionMock.insertOnlyEventDataRecord(
      mockedEvent,
      boxSerialized,
      100,
      spendTxId,
      spendBlockId
    );

    // mock ChainHandler fromChain and ErgoChain
    ChainHandlerMock.mockChainName(CARDANO_CHAIN, true);
    // mock `getTransaction`
    ChainHandlerMock.mockErgoFunctionReturnValue('getTransaction', tx, true);
    // mock `extractSignedTransactionOrder`
    ChainHandlerMock.mockErgoFunctionReturnValue(
      'extractSignedTransactionOrder',
      testData.fraudTxOrder
    );
    // mock `getChainConfigs`
    ChainHandlerMock.mockFromChainFunction(
      'getChainConfigs',
      GuardsCardanoConfigs.chainConfigs
    );

    // run test
    await revenueJobFunction();

    // check database
    const dbRevenues = (await DatabaseActionMock.allRevenueRecords()).map(
      (revenue) => [
        revenue.tokenId,
        revenue.amount,
        revenue.revenueType,
        revenue.txId,
      ]
    );
    expect(dbRevenues.length).toEqual(2);
    expect(dbRevenues).toContainEqual([
      ERG,
      100n,
      RevenueType.fraud,
      spendTxId,
    ]);
    expect(dbRevenues).toContainEqual([
      'id1',
      10n,
      RevenueType.fraud,
      spendTxId,
    ]);
  });

  /**
   * @target revenueJobFunction should store bridge-fee,
   * emission and network-fee revenues successfully
   * @dependencies
   * - database
   * - ChainHandler
   * @scenario
   * - mock event with spendTxId and spendBlockId
   * - mock ChainHandler fromChain and ErgoChain
   *   - mock `getTransaction`
   *   - mock `extractSignedTransactionOrder`
   *   - mock `getChainConfigs`
   * - run test
   * - check database
   * @expected
   * - two revenues should be inserted with correct amount and type
   *   for three types (bridge-fee, emission and network-fee)
   *   - Erg revenue
   *   - Token revenue
   */
  it('should store bridge-fee, emission and network-fee revenues successfully', async () => {
    // mock event with spendTxId and spendBlockId
    const mockedEvent = mockTokenPaymentEvent();
    const spendTxId = TestUtils.generateRandomId();
    const spendBlockId = TestUtils.generateRandomId();
    const boxSerialized = 'boxSerialized';
    const tx = 'serialized-tx';

    // insert mocked event
    await DatabaseActionMock.insertOnlyEventDataRecord(
      mockedEvent,
      boxSerialized,
      100,
      spendTxId,
      spendBlockId
    );

    // mock ChainHandler fromChain and ErgoChain
    ChainHandlerMock.mockChainName(CARDANO_CHAIN, true);
    // mock `getTransaction`
    ChainHandlerMock.mockErgoFunctionReturnValue('getTransaction', tx, true);
    // mock `extractSignedTransactionOrder`
    ChainHandlerMock.mockErgoFunctionReturnValue(
      'extractSignedTransactionOrder',
      testData.rewardTxOrder
    );
    // mock `getChainConfigs`
    ChainHandlerMock.mockFromChainFunction(
      'getChainConfigs',
      GuardsCardanoConfigs.chainConfigs
    );

    // run test
    await revenueJobFunction();

    // check database
    const dbRevenues = (await DatabaseActionMock.allRevenueRecords()).map(
      (revenue) => [
        revenue.tokenId,
        revenue.amount,
        revenue.revenueType,
        revenue.txId,
      ]
    );
    expect(dbRevenues.length).toEqual(6);
    // bridge-fee revenues
    expect(dbRevenues).toContainEqual([
      ERG,
      100n,
      RevenueType.bridgeFee,
      spendTxId,
    ]);
    expect(dbRevenues).toContainEqual([
      'id1',
      10n,
      RevenueType.bridgeFee,
      spendTxId,
    ]);
    // emission revenues
    expect(dbRevenues).toContainEqual([
      ERG,
      200n,
      RevenueType.emission,
      spendTxId,
    ]);
    expect(dbRevenues).toContainEqual([
      'id2',
      20n,
      RevenueType.emission,
      spendTxId,
    ]);
    // network-fee revenues
    expect(dbRevenues).toContainEqual([
      ERG,
      300n,
      RevenueType.networkFee,
      spendTxId,
    ]);
    expect(dbRevenues).toContainEqual([
      'id1',
      30n,
      RevenueType.networkFee,
      spendTxId,
    ]);
  });

  /**
   * @target revenueJobFunction should skip revenues of
   * unconfirmed transactions
   * @dependencies
   * - database
   * - ChainHandler
   * @scenario
   * - mock event with spendTxId and spendBlockId
   * - mock ChainHandler.ErgoChain
   *   - mock `getTxConfirmationStatus`
   *   - mock `getTransaction`
   * - run test
   * - check database
   * @expected
   * - `getTransaction` should NOT got called
   */
  it('should skip revenues of unconfirmed transactions', async () => {
    // mock event with spendTxId and spendBlockId
    const mockedEvent = mockTokenPaymentEvent();
    const spendTxId = TestUtils.generateRandomId();
    const spendBlockId = TestUtils.generateRandomId();
    const boxSerialized = 'boxSerialized';

    // insert mocked event
    await DatabaseActionMock.insertOnlyEventDataRecord(
      mockedEvent,
      boxSerialized,
      113,
      spendTxId,
      spendBlockId
    );

    // mock ChainHandler.ErgoChain
    // mock `getTransaction`
    ChainHandlerMock.mockErgoFunctionReturnValue('getTransaction', null, true);

    // run test
    await revenueJobFunction();

    // `getTransaction` should NOT got called
    expect(
      ChainHandlerMock.getErgoMockedFunction('getTransaction')
    ).not.toHaveBeenCalled();
  });
});
