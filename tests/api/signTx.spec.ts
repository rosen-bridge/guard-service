import fastify from 'fastify';

import { TransactionType } from '@rosen-chains/abstract-chain';
import { CARDANO_CHAIN } from '@rosen-chains/cardano';

import { FastifySeverInstance } from '../../src/api/schemas';
import { signRoute } from '../../src/api/signTx';
import GuardPkHandler from '../../src/handlers/guardPkHandler';
import { TransactionStatus } from '../../src/utils/constants';
import { mockPaymentTransaction } from '../agreement/testData';
import DatabaseActionMock from '../db/mocked/databaseAction.mock';
import ChainHandlerMock from '../handlers/chainHandler.mock';

describe('signTx', () => {
  const requiredSign = 3;

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
        '',
      );

      // mock ChainHandler `getChain`
      const chain = CARDANO_CHAIN;
      ChainHandlerMock.mockChainName(chain);
      // mock `rawTxToPaymentTransaction`
      ChainHandlerMock.mockChainFunction(
        chain,
        'rawTxToPaymentTransaction',
        paymentTx,
        true,
      );

      // send a request to the server
      const result = await mockedServer.inject({
        method: 'POST',
        url: '/sign',
        body: {
          chain: CARDANO_CHAIN,
          txJson: 'txJson',
          requiredSign: requiredSign,
        },
        headers: {
          'Api-Key': 'hello',
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
      expect(dbTxs).toContainEqual([
        paymentTx.txId,
        null,
        paymentTx.network,
        paymentTx.txType,
      ]);
    });

    /**
     * @target fastifyServer[POST /sign] should return 400 when tx json is invalid
     * @dependencies
     * - ChainHandler
     * - database
     * @scenario
     * - mock ChainHandler `getChain`
     *   - mock `rawTxToPaymentTransaction` to throw error
     * - send a request to the server
     * - check the result
     * - check database
     * @expected
     * - it should return status code 200
     * - no tx should be inserted into db
     */
    it('should return 400 when tx json is invalid', async () => {
      // mock ChainHandler `getChain`
      const chain = CARDANO_CHAIN;
      ChainHandlerMock.mockChainName(chain);
      // mock `rawTxToPaymentTransaction`
      ChainHandlerMock.mockChainFunctionToThrow(
        chain,
        'rawTxToPaymentTransaction',
        new Error(`TestError: failed to parse tx`),
        true,
      );

      // send a request to the server
      const result = await mockedServer.inject({
        method: 'POST',
        url: '/sign',
        body: {
          chain: CARDANO_CHAIN,
          txJson: 'txJson',
          requiredSign: requiredSign,
        },
        headers: {
          'Api-Key': 'hello',
        },
      });

      // check the result
      expect(result.statusCode).toEqual(400);

      // check database
      const dbTxs = await DatabaseActionMock.allTxRecords();
      expect(dbTxs.length).toEqual(0);
    });

    /**
     * @target fastifyServer[POST /sign] should return 409 when tx is already in database
     * @dependencies
     * - ChainHandler
     * - database
     * @scenario
     * - mock PaymentTransaction
     * - insert mocked tx into db
     * - mock ChainHandler `getChain`
     *   - mock `rawTxToPaymentTransaction`
     * - send a request to the server
     * - check the result
     * @expected
     * - it should return status code 409
     */
    it('should return 409 when tx is already in database', async () => {
      // mock PaymentTransaction
      const paymentTx = mockPaymentTransaction(
        TransactionType.manual,
        CARDANO_CHAIN,
        '',
      );

      // insert mocked tx into db
      await DatabaseActionMock.insertTxRecord(
        paymentTx,
        TransactionStatus.approved,
        undefined,
        undefined,
        undefined,
        undefined,
        requiredSign,
      );

      // mock ChainHandler `getChain`
      const chain = CARDANO_CHAIN;
      ChainHandlerMock.mockChainName(chain);
      // mock `rawTxToPaymentTransaction`
      ChainHandlerMock.mockChainFunction(
        chain,
        'rawTxToPaymentTransaction',
        paymentTx,
        true,
      );

      // send a request to the server
      const result = await mockedServer.inject({
        method: 'POST',
        url: '/sign',
        body: {
          chain: CARDANO_CHAIN,
          txJson: 'txJson',
          requiredSign: requiredSign,
        },
        headers: {
          'Api-Key': 'hello',
        },
      });

      // check the result
      expect(result.statusCode).toEqual(409);
    });

    /**
     * @target fastifyServer[POST /sign] should update required sign
     * when overwrite key is passed
     * @dependencies
     * - ChainHandler
     * - database
     * @scenario
     * - mock PaymentTransaction
     * - insert mocked tx into db
     * - mock ChainHandler `getChain`
     *   - mock `rawTxToPaymentTransaction`
     * - send a request to the server
     * - check the result
     * - check database
     * @expected
     * - it should return status code 200
     * - tx requiredSign should be updated
     */
    it('should update required sign when overwrite key is passed', async () => {
      // mock PaymentTransaction
      const paymentTx = mockPaymentTransaction(
        TransactionType.manual,
        CARDANO_CHAIN,
        '',
      );

      // insert mocked tx into db
      await DatabaseActionMock.insertTxRecord(
        paymentTx,
        TransactionStatus.approved,
        undefined,
        undefined,
        undefined,
        undefined,
        requiredSign,
      );

      // mock ChainHandler `getChain`
      const chain = CARDANO_CHAIN;
      ChainHandlerMock.mockChainName(chain);
      // mock `rawTxToPaymentTransaction`
      ChainHandlerMock.mockChainFunction(
        chain,
        'rawTxToPaymentTransaction',
        paymentTx,
        true,
      );

      // send a request to the server
      const newRequiredSign = requiredSign + 1;
      const result = await mockedServer.inject({
        method: 'POST',
        url: '/sign',
        body: {
          chain: CARDANO_CHAIN,
          txJson: 'txJson',
          requiredSign: newRequiredSign,
          overwrite: true,
        },
        headers: {
          'Api-Key': 'hello',
        },
      });

      // check the result
      expect(result.statusCode).toEqual(200);

      // check database
      const dbTxs = (await DatabaseActionMock.allTxRecords()).map((tx) => [
        tx.txId,
        tx.requiredSign,
      ]);
      expect(dbTxs.length).toEqual(1);
      expect(dbTxs).toContainEqual([paymentTx.txId, newRequiredSign]);
    });

    /**
     * @target fastifyServer[POST /sign] should return 400 when required sign is invalid
     * @dependencies
     * - ChainHandler
     * - database
     * @scenario
     * - mock PaymentTransaction
     * - mock ChainHandler `getChain`
     *   - mock `rawTxToPaymentTransaction`
     * - send a request to the server
     * - check the result
     * @expected
     * - it should return status code 400
     */
    it('should return 400 when required sign is invalid', async () => {
      // mock PaymentTransaction
      const paymentTx = mockPaymentTransaction(
        TransactionType.manual,
        CARDANO_CHAIN,
        '',
      );

      // mock ChainHandler `getChain`
      const chain = CARDANO_CHAIN;
      ChainHandlerMock.mockChainName(chain);
      // mock `rawTxToPaymentTransaction`
      ChainHandlerMock.mockChainFunction(
        chain,
        'rawTxToPaymentTransaction',
        paymentTx,
        true,
      );

      // send a request to the server
      const result = await mockedServer.inject({
        method: 'POST',
        url: '/sign',
        body: {
          chain: CARDANO_CHAIN,
          txJson: 'txJson',
          requiredSign: GuardPkHandler.getInstance().guardsLen + 1,
        },
        headers: {
          'Api-Key': 'hello',
        },
      });

      // check the result
      expect(result.statusCode).toEqual(400);
    });

    /**
     * @target fastifyServer[POST /sign] should return 403 when Api-Key did not set in header
     * @dependencies
     * @scenario
     * - send a request to the server
     * - check the result
     * @expected
     * - it should return status code 403
     */
    it('should return 403 when Api-Key did not set in header', async () => {
      // send a request to the server
      const result = await mockedServer.inject({
        method: 'POST',
        url: '/sign',
        body: {
          chain: CARDANO_CHAIN,
          txJson: 'txJson',
          requiredSign: GuardPkHandler.getInstance().guardsLen,
        },
      });
      // check the result
      expect(result.statusCode).toEqual(403);
    });

    /**
     * @target fastifyServer[POST /sign] should return 403 when Api-Key is wrong
     * @dependencies
     * @scenario
     * - send a request to the server
     * - check the result
     * @expected
     * - it should return status code 403
     */
    it('should return 403 when Api-Key is wrong', async () => {
      // send a request to the server
      const result = await mockedServer.inject({
        method: 'POST',
        url: '/sign',
        body: {
          chain: CARDANO_CHAIN,
          txJson: 'txJson',
          requiredSign: GuardPkHandler.getInstance().guardsLen,
        },
        headers: {
          'Api-Key': 'wrong',
        },
      });
      // check the result
      expect(result.statusCode).toEqual(403);
    });
  });
});
