import ChainHandlerMock from '../handlers/ChainHandler.mock';
import { TransactionType } from '@rosen-chains/abstract-chain';
import { CARDANO_CHAIN } from '@rosen-chains/cardano';
import fastify from 'fastify';
import { FastifySeverInstance } from '../../src/api/schemas';
import { signRoute } from '../../src/api/signTx';
import { mockPaymentTransaction } from '../agreement/testData';
import DatabaseActionMock from '../db/mocked/DatabaseAction.mock';

describe('signTx', () => {
  describe('POST /sign', () => {
    let mockedServer: FastifySeverInstance;

    beforeEach(async () => {
      mockedServer = fastify();
      mockedServer.register(signRoute);
      ChainHandlerMock.resetMock();
      await DatabaseActionMock.clearTables();
    });

    afterEach(() => {
      mockedServer.close();
    });

    /**
     * @target fastifyServer[POST /sign] should insert new tx successfully
     * @dependencies
     * - ChainHandler
     * - database
     * @scenario
     * - mock PaymentTransaction
     * - mock ChainHandler `getChain`
     *   - mock `rawTxToPaymentTransaction`
     * - send a request to the server
     * - check the result
     * - check database
     * @expected
     * - it should return status code 200
     * - tx should be inserted into db
     */
    it('should insert new tx successfully', async () => {
      // mock PaymentTransaction
      const paymentTx = mockPaymentTransaction(
        TransactionType.manual,
        CARDANO_CHAIN,
        ''
      );

      // mock ChainHandler `getChain`
      ChainHandlerMock.mockChainName(CARDANO_CHAIN);
      // mock `rawTxToPaymentTransaction`
      ChainHandlerMock.mockToChainFunction(
        'rawTxToPaymentTransaction',
        paymentTx
      );

      // send a request to the server
      const result = await mockedServer.inject({
        method: 'POST',
        url: '/sign',
        body: {
          chain: CARDANO_CHAIN,
          txJson: 'txJson',
        },
      });

      // check the result
      expect(result.statusCode).toEqual(200);

      // check database
      const dbTxs = (await DatabaseActionMock.allTxRecords()).map((tx) => [
        tx.txId,
        tx.event,
        tx.chain,
        tx.type,
      ]);
      expect(dbTxs.length).toEqual(1);
      expect(dbTxs).to.deep.contain([
        paymentTx.txId,
        null,
        paymentTx.network,
        paymentTx.txType,
      ]);
    });
  });
});
