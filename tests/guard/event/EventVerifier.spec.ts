import { mockExplorerGetTxConfirmation } from '../../chains/ergo/mocked/MockedExplorer';
import { expect } from 'chai';
import { EventTrigger } from '../../../src/models/Models';
import TestUtils from '../../testUtils/TestUtils';
import { mockKoiosGetTxConfirmation } from '../../chains/cardano/mocked/MockedKoios';
import TestBoxes from '../../chains/ergo/testUtils/TestBoxes';
import ChainsConstants from '../../../src/chains/ChainsConstants';
import { mockGetEventBox } from '../../chains/ergo/mocked/MockedInputBoxes';
import { anything } from 'ts-mockito';
import ErgoConfigs from '../../../src/chains/ergo/helpers/ErgoConfigs';
import TestConfigs from '../../testUtils/TestConfigs';
import {
  mockGetHeight,
  resetMockedNodeApi,
} from '../../chains/ergo/mocked/MockedNode';
import EventVerifier from '../../../src/guard/event/EventVerifier';
import { resetMockedEventVerifier } from '../mocked/MockedEventVerifier';

describe('EventVerifier', () => {
  describe('isEventConfirmedEnough', () => {
    const eventBoxAndCommitments = TestBoxes.mockEventBoxWithSomeCommitments();

    beforeEach('reset isEventConfirmedEnough mock', () => {
      resetMockedEventVerifier();
    });

    afterEach('reset NodeApi mock', () => {
      resetMockedNodeApi();
    });

    /**
     * Target: testing isEventConfirmedEnough
     * Dependencies:
     *    ExplorerApi
     *    NodeApi
     *    InputBoxes
     * Scenario:
     *    Mock a Cardano event trigger
     *    Mock a getEventBox to return test event box
     *    Mock NodeApi to return mocked height of blockchain (so that event box doesn't confirmed enough)
     *    Run test (execute isEventConfirmedEnough method of EventProcessor)
     *    Check return value to be false
     * Expected Output:
     *    The function should return false
     */
    it('should return false when event box does not confirmed enough in ergo', async () => {
      const fromErgoEventTrigger = new EventTrigger(
        ChainsConstants.cardano,
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        TestUtils.generateRandomId(),
        '',
        TestConfigs.cardano.blockchainHeight - 100,
        []
      );

      // mock event box and current height
      mockGetEventBox(anything(), eventBoxAndCommitments[0]);
      const mockedHeight =
        TestConfigs.ergo.blockchainHeight +
        ErgoConfigs.requiredConfirmation -
        1;
      mockGetHeight(mockedHeight);

      // run test
      const result = await EventVerifier.isEventConfirmedEnough(
        fromErgoEventTrigger,
        TestConfigs.ergo.blockchainHeight
      );
      expect(result).to.be.false;
    });

    /**
     * Target: testing isEventConfirmedEnough
     * Dependencies:
     *    ExplorerApi
     *    NodeApi
     *    InputBoxes
     * Expected Output:
     *    The function should return true
     */
    it('should return true when event confirmed enough in ergo', async () => {
      const txId = TestUtils.generateRandomId();
      const fromErgoEventTrigger = new EventTrigger(
        ChainsConstants.ergo,
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        txId,
        '',
        TestConfigs.ergo.blockchainHeight - 40,
        []
      );
      mockExplorerGetTxConfirmation(txId, 30);

      // mock event box and current height
      mockGetEventBox(anything(), eventBoxAndCommitments[0]);
      const mockedHeight =
        TestConfigs.ergo.blockchainHeight +
        ErgoConfigs.requiredConfirmation +
        1;
      mockGetHeight(mockedHeight);

      // run test
      const result = await EventVerifier.isEventConfirmedEnough(
        fromErgoEventTrigger,
        TestConfigs.ergo.blockchainHeight
      );
      expect(result).to.be.true;
    });

    /**
     * Target: testing isEventConfirmedEnough
     * Dependencies:
     *    KoiosApi
     *    NodeApi
     *    InputBoxes
     * Expected Output:
     *    The function should return true
     */
    it('should return true when event confirmed enough in cardano', async () => {
      const txId = TestUtils.generateRandomId();
      const fromCardanoEventTrigger = new EventTrigger(
        ChainsConstants.cardano,
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        txId,
        '',
        TestConfigs.cardano.blockchainHeight - 100,
        []
      );
      mockKoiosGetTxConfirmation(txId, 30);

      // mock event box and current height
      mockGetEventBox(anything(), eventBoxAndCommitments[0]);
      const mockedHeight =
        TestConfigs.ergo.blockchainHeight +
        ErgoConfigs.requiredConfirmation +
        1;
      mockGetHeight(mockedHeight);

      // run test
      const result = await EventVerifier.isEventConfirmedEnough(
        fromCardanoEventTrigger,
        TestConfigs.ergo.blockchainHeight
      );
      expect(result).to.be.true;
    });
  });
});
