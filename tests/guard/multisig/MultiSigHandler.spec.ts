import { SpyInstance } from 'vitest';
import MultiSigHandler from '../../../src/guard/multisig/MultiSigHandler';
import DialerMock, {
  dialerInstance,
} from '../../communication/mocked/Dialer.mock';
import * as wasm from 'ergo-lib-wasm-nodejs';
import MultiSigUtils from '../../../src/guard/multisig/MultiSigUtils';
import {
  mockPartialSignedTransaction,
  mockedErgoStateContext,
} from './testData';
import { CommitmentMisMatch } from '../../../src/utils/errors';
import TestConfigs from '../../testUtils/TestConfigs';

describe('MultiSigHandler', () => {
  const publicKeys = [
    '028d938d67befbb8ab3513c44886c16c2bcd62ed4595b9b216b20ef03eb8fb8fb8',
    '03074e09c476bb215dc3aeff908d0b7691895a99dfc3bd950fa629defe541e0364',
    '0300e8750a242ee7d78f5b458e1f7474bd884d2b7894676412ba6b5f319d2ee410',
    '023a5b48c87cd9fece23f5acd08cb464ceb9d76e3c1ddac08206980a295546bb2e',
  ];

  const generateMultiSigHandlerInstance = async (
    secret: string,
    pks = publicKeys
  ): Promise<MultiSigHandler> => {
    const handler = new MultiSigHandler(
      pks,
      '5bc1d17d0612e696a9138ab8e85ca2a02d0171440ec128a9ad557c28bd5ea046'
    );
    await handler.init();
    return handler;
  };

  /**
   * mocks Dialer.sendMessage such to throw error if at least one key
   * doesn't exists in sent message
   * @param bodyKeys
   * @param payloadKeys
   */
  const checkSendMessageBodyAndPayloadArguments = (
    bodyKeys: Array<string>,
    payloadKeys: Array<string>
  ) => {
    DialerMock.mockSendMessageImplementation(
      async (channel: string, msg: string, receiver?: string) => {
        const json = JSON.parse(msg);
        if (json.type === 'approve') {
          payloadKeys.forEach((key) => {
            if (!(key in json.payload))
              throw `key "${key}" is not in the dialer payload message`;
          });
          bodyKeys.forEach((key) => {
            if (!(key in json)) throw 'key is not in the message';
          });
        }
      }
    );
  };

  describe('sendMessage', () => {
    beforeEach(() => {
      DialerMock.resetMock();
    });

    /**
     * @target MultiSigHandler.sendMessage should send message with
     * expected keys
     * @dependencies
     * - Dialer
     * @scenario
     * - mock Dialer.sendMessage to throw error if expectation does not meet
     * - run test
     * @expected
     * - sent message should contain 'sign' and 'payload' key
     * - sent message payload should contain 'index', 'id', 'nonce' and 'myId'
     */
    it('should send message with expected keys', async () => {
      // mock Dialer.sendMessage
      checkSendMessageBodyAndPayloadArguments(
        ['sign'],
        ['index', 'id', 'nonce', 'myId']
      );

      // run test
      const handler = await generateMultiSigHandlerInstance(
        '5bc1d17d0612e696a9138ab8e85ca2a02d0171440ec128a9ad557c28bd5ea046'
      );
      await handler.sendMessage({
        type: 'approve',
        payload: {
          nonce: 'nonce',
          myId: 'peerId',
          nonceToSign: 'nonceToSign',
        },
      });
    });
  });

  describe('getIndex', () => {
    /**
     * @target MultiSigHandler.getIndex should return guard index successfully
     * @dependencies
     * @scenario
     * - run test
     * - check returned value
     * @expected
     * - returned value should be 0
     */
    it('should return guard index successfully', async () => {
      const handler = await generateMultiSigHandlerInstance(
        '5bc1d17d0612e696a9138ab8e85ca2a02d0171440ec128a9ad557c28bd5ea046'
      );
      expect(handler.getIndex()).toEqual(0);
    });
  });

  describe('getProver', () => {
    /**
     * @target MultiSigHandler.getProver should run successfully
     * @dependencies
     * @scenario
     * - run test
     * @expected
     * - only no error throws
     */
    it('should run successfully', () => {
      const handler = new MultiSigHandler(
        publicKeys,
        '5bc1d17d0612e696a9138ab8e85ca2a02d0171440ec128a9ad557c28bd5ea046'
      );
      handler.getProver();
    });
  });

  describe('handleApprove', () => {
    beforeEach(() => {
      DialerMock.resetMock();
    });

    /**
     * @target MultiSigHandler.handleApprove should send message with
     * expected keys
     * @dependencies
     * - Dialer
     * @scenario
     * - mock Dialer.sendMessage to throw error if expectation does not meet
     * - run test
     * @expected
     * - sent message should contain 'type', 'sign' and 'payload' key
     * - sent message payload should contain 'nonceToSign'
     */
    it('should send message with expected keys', async () => {
      // mock Dialer.sendMessage
      checkSendMessageBodyAndPayloadArguments(
        ['type', 'sign', 'payload'],
        ['nonceToSign']
      );

      // run test
      const handler = await generateMultiSigHandlerInstance(
        '5bc1d17d0612e696a9138ab8e85ca2a02d0171440ec128a9ad557c28bd5ea046'
      );
      handler.handleApprove('sender', {
        index: 1,
        nonce: 'nonce',
        myId: 'sender',
        nonceToSign: '1',
      });
    });
  });

  describe('handleMessage', () => {
    const functionNames = [
      'handleCommitment',
      'handleSign',
      'handleRegister',
      'handleApprove',
    ];

    /**
     * @target MultiSigHandler.handleMessage should call correct
     * handle function
     * @dependencies
     * @scenario
     * - mock all handle functions of MultiSigHandler
     * - mock message
     * - run test
     * - check if function got called
     * @expected
     * - expected handle function should got called
     * - other handle functions should NOT got called
     */
    it.each([
      ['handleCommitment', 'commitment'],
      ['handleApprove', 'approve'],
      ['handleRegister', 'register'],
      ['handleSign', 'sign'],
    ])(
      'should call `%s` when type is `%s`',
      async (handleFunction, messageType) => {
        // mock all handle functions of MultiSigHandler
        const handler = await generateMultiSigHandlerInstance(
          '168e8fee8ac6965832d6c1c17cdf60c1b582b09f293d8bd88231e32740e3b24f'
        );
        const handleFunctions = new Map<string, SpyInstance>();
        functionNames.forEach((functionName) =>
          handleFunctions.set(
            functionName,
            vi.spyOn(handler, functionName as any)
          )
        );

        // mock message
        const message = `{"type":"${messageType}","payload":{"txId":"356ebd85f01ee25c3c241950b77d533ee46bcdc7c3a02a2f24bb25946b9fec96","commitment":{"0":[{"a":"02acf3bf8466386df1cedca127ac8e025223ce1f88f430fc6f1dfabc424857e15c","position":"0-1"}]},"index":1,"id":"12D3KooWSC69DeYqzwjeDYFFXqEgNPUvDxVaypezZpkUXVA8UkR2"},"sign":"+nHOaX5etrB+JI3tMa+EfSsBX7tBKhALubQ7D3iLl4VuzsXFOFfkgpas8tPm5/nrElGW5Y4CpzB+DuWAEvK1sA=="}`;

        // run test
        handler.handleMessage(
          message,
          'multi-sig',
          '12D3KooWSC69DeYqzwjeDYFFXqEgNPUvDxVaypezZpkUXVA8UkR2'
        );
        handleFunctions.forEach((spy, functionName) => {
          if (functionName === handleFunction)
            expect(spy).toHaveBeenCalledOnce();
          else expect(spy).not.toHaveBeenCalledOnce();
        });
      }
    );
  });

  describe('getPeerId', () => {
    /**
     * @target MultiSigHandler.getPeerId should return guard peerId successfully
     * @dependencies
     * - Dialer
     * @scenario
     * - run test
     * - check returned value
     * @expected
     * - returned value should be mocked dialer
     */
    it("should return peerId equal to 'peerId'", async () => {
      const handler = await generateMultiSigHandlerInstance(
        '5bc1d17d0612e696a9138ab8e85ca2a02d0171440ec128a9ad557c28bd5ea046'
      );
      const mockedDialerPeerId = dialerInstance.getDialerId();
      expect(handler.getPeerId()).toEqual(mockedDialerPeerId);
    });
  });

  describe('handlePublicKeysChange', () => {
    const updatedPublicKeys = [
      '028d938d67befbb8ab3513c44886c16c2bcd62ed4595b9b216b20ef03eb8fb8fb1',
      '028d938d67befbb8ab3513c44886c16c2bcd62ed4595b9b216b20ef03eb8fb8fb2',
      '028d938d67befbb8ab3513c44886c16c2bcd62ed4595b9b216b20ef03eb8fb8fb3',
      '028d938d67befbb8ab3513c44886c16c2bcd62ed4595b9b216b20ef03eb8fb8fb4',
      '028d938d67befbb8ab3513c44886c16c2bcd62ed4595b9b216b20ef03eb8fb8fb5',
      '028d938d67befbb8ab3513c44886c16c2bcd62ed4595b9b216b20ef03eb8fb8fb6',
      '028d938d67befbb8ab3513c44886c16c2bcd62ed4595b9b216b20ef03eb8fb8fb7',
    ];

    /**
     * @target MultiSigHandler.handlePublicKeysChange should update peers
     * and send register message
     * @dependencies
     * @scenario
     * - mock `sendRegister`
     * - run test
     * - check if new index is verified
     * - check if function got called
     * @expected
     * - index 6 should get verified
     * - `sendRegister` should got called
     */
    it('should update peers based on new public keys', async () => {
      // mock `sendRegister`
      const handler = await generateMultiSigHandlerInstance(
        '5bc1d17d0612e696a9138ab8e85ca2a02d0171440ec128a9ad557c28bd5ea046'
      );
      const mockedSendRegister = vi.fn();
      vi.spyOn(handler, 'sendRegister').mockImplementation(mockedSendRegister);

      handler.handlePublicKeysChange(updatedPublicKeys);

      // check if new index is verified
      expect(handler.verifyIndex(6)).toEqual(true);

      // check if function got called
      expect(mockedSendRegister).toHaveBeenCalledOnce();
    });
  });

  describe('handleRegister', () => {
    /**
     * @target MultiSigHandler.handleRegister should handle and send response successfully
     * @dependencies
     * @scenario
     * - mock MultiSigHandler.sendMessage
     * - run test
     * - check if function got called
     * @expected
     * - `sendMessage` should got called
     */
    it('should handle and send response successfully', async () => {
      // mock MultiSigHandler.sendMessage
      const handler = await generateMultiSigHandlerInstance(
        '5bc1d17d0612e696a9138ab8e85ca2a02d0171440ec128a9ad557c28bd5ea046'
      );
      const mockedSendMessage = vi.fn();
      vi.spyOn(handler, 'sendMessage').mockImplementation(mockedSendMessage);

      // run test
      handler.handleRegister('sender', {
        index: 1,
        nonce: 'nonce',
        myId: 'myId',
      });

      // check if function got called
      expect(mockedSendMessage).toHaveBeenCalledOnce();
    });
  });

  describe('handleSign', () => {
    /**
     * @target MultiSigHandler.handleSign should generate sign
     * with no error when updateSign is true
     * @dependencies
     * @scenario
     * - mock test data
     * - mock `getQueuedTransaction`
     * - mock `verifySignedPayload`
     * - mock `generateSign`
     * - run test
     * - check if function got called
     * @expected
     * - `generateSign` should got called
     */
    it('should generate sign with no error when updateSign is true', async () => {
      // mock test data
      const box1Hex =
        '80a8d6b907100304000e20a6ac381e6fa99929fd1477b3ba9499790a775e91d4c14c5aa86e9a118dfac8530400d801d601b2db6501fe730000ea02d1aedb63087201d901024d0e938c720201730198b2e4c672010510730200ade4c67201041ad901020ecdee72028cc10f00003a4f8dac9bbe80fffaf400edd5779b7ccd5628beceab06c41b5b7b3e091e963501';
      const dataBoxHex =
        '80ade2041006040004000400040004000402d804d601b2a5730000d602e4c6a7041ad603e4c6a70510d604ad7202d901040ecdee7204ea02d19683020193c27201c2a7938cb2db63087201730100018cb2db6308a773020001eb02ea02d19683020193e4c67201041a720293e4c672010510720398b2e4c6b2db6501fe7303000510730400720498b2720373050072048cc10f01a6ac381e6fa99929fd1477b3ba9499790a775e91d4c14c5aa86e9a118dfac85301021a0421028d938d67befbb8ab3513c44886c16c2bcd62ed4595b9b216b20ef03eb8fb8fb82103074e09c476bb215dc3aeff908d0b7691895a99dfc3bd950fa629defe541e0364210300e8750a242ee7d78f5b458e1f7474bd884d2b7894676412ba6b5f319d2ee41021023a5b48c87cd9fece23f5acd08cb464ceb9d76e3c1ddac08206980a295546bb2e100206081d827c338829135cc5c7d7f03ad9ba8ecffc6f5cddf63a2655c55922786230c000';
      const box1 = wasm.ErgoBox.sigma_parse_bytes(
        Uint8Array.from(Buffer.from(box1Hex, 'hex'))
      );
      const dataBox = wasm.ErgoBox.sigma_parse_bytes(
        Uint8Array.from(Buffer.from(dataBoxHex, 'hex'))
      );

      // mock `getQueuedTransaction`
      const handler = await generateMultiSigHandlerInstance(
        '5bc1d17d0612e696a9138ab8e85ca2a02d0171440ec128a9ad557c28bd5ea046'
      );
      const obj = {
        transaction: {
          boxes: [box1],
          dataBoxes: [dataBox],
          commitments: [undefined],
          commitmentSigns: [''],
          createTime: 0,
          requiredSigner: 2,
        },
        release: () => null,
      };
      vi.spyOn(handler, 'getQueuedTransaction').mockResolvedValue(obj);

      // mock `verifySignedPayload`
      vi.spyOn(handler, 'verifySignedPayload').mockResolvedValue();

      // mock `generateSign`
      const mockedGenerateSign = vi.fn();
      vi.spyOn(handler, 'generateSign').mockImplementation(mockedGenerateSign);

      // run test
      await handler.handleSign('sender', {
        commitments: [],
        signed: ['1'],
        simulated: ['2'],
        tx: '',
        txId: 'txid',
      });

      // `generateSign` should got called
      expect(mockedGenerateSign).toHaveBeenCalledWith('txid', obj.transaction);
    });

    /**
     * @target MultiSigHandler.handleSign should generate sign
     * with no error when updateSign is false
     * @dependencies
     * @scenario
     * - mock test data
     * - mock `getQueuedTransaction`
     * - mock `verifySignedPayload`
     * - mock `generateSign`
     * - run test
     * - check if function got called
     * @expected
     * - `generateSign` should got called
     */
    it('should generate sign with no error when updateSign is false', async () => {
      // mock test data
      const box1Hex =
        '80a8d6b907100304000e20a6ac381e6fa99929fd1477b3ba9499790a775e91d4c14c5aa86e9a118dfac8530400d801d601b2db6501fe730000ea02d1aedb63087201d901024d0e938c720201730198b2e4c672010510730200ade4c67201041ad901020ecdee72028cc10f00003a4f8dac9bbe80fffaf400edd5779b7ccd5628beceab06c41b5b7b3e091e963501';
      const dataBoxHex =
        '80ade2041006040004000400040004000402d804d601b2a5730000d602e4c6a7041ad603e4c6a70510d604ad7202d901040ecdee7204ea02d19683020193c27201c2a7938cb2db63087201730100018cb2db6308a773020001eb02ea02d19683020193e4c67201041a720293e4c672010510720398b2e4c6b2db6501fe7303000510730400720498b2720373050072048cc10f01a6ac381e6fa99929fd1477b3ba9499790a775e91d4c14c5aa86e9a118dfac85301021a0421028d938d67befbb8ab3513c44886c16c2bcd62ed4595b9b216b20ef03eb8fb8fb82103074e09c476bb215dc3aeff908d0b7691895a99dfc3bd950fa629defe541e0364210300e8750a242ee7d78f5b458e1f7474bd884d2b7894676412ba6b5f319d2ee41021023a5b48c87cd9fece23f5acd08cb464ceb9d76e3c1ddac08206980a295546bb2e100206081d827c338829135cc5c7d7f03ad9ba8ecffc6f5cddf63a2655c55922786230c000';
      const box1 = wasm.ErgoBox.sigma_parse_bytes(
        Uint8Array.from(Buffer.from(box1Hex, 'hex'))
      );
      const dataBox = wasm.ErgoBox.sigma_parse_bytes(
        Uint8Array.from(Buffer.from(dataBoxHex, 'hex'))
      );

      // mock `getQueuedTransaction`
      const handler = await generateMultiSigHandlerInstance(
        '5bc1d17d0612e696a9138ab8e85ca2a02d0171440ec128a9ad557c28bd5ea046'
      );
      const obj = {
        transaction: {
          boxes: [box1],
          dataBoxes: [dataBox],
          commitments: [undefined],
          commitmentSigns: [''],
          createTime: 0,
          requiredSigner: 2,
          sign: {
            signed: ['sign'],
            simulated: ['simulated'],
            transaction: new Uint8Array([2]),
          },
        },
        release: () => null,
      };
      vi.spyOn(handler, 'getQueuedTransaction').mockResolvedValue(obj);

      // mock `verifySignedPayload`
      vi.spyOn(handler, 'verifySignedPayload').mockResolvedValue();

      // mock `generateSign`
      const mockedGenerateSign = vi.fn();
      vi.spyOn(handler, 'generateSign').mockImplementation(mockedGenerateSign);

      // run test
      await handler.handleSign('sender', {
        commitments: [],
        signed: ['1'],
        simulated: ['2'],
        tx: '',
        txId: 'txid',
      });

      // `generateSign` should got called
      expect(mockedGenerateSign).toHaveBeenCalledWith('txid', obj.transaction);
    });
  });

  describe('handleCommitment', () => {
    /**
     * @target MultiSigHandler.handleCommitment should generate sign
     * with no error
     * @dependencies
     * @scenario
     * - mock test data
     * - mock `getQueuedTransaction`
     * - mock `generateSign`
     * - run test
     * - check if functions got called
     * @expected
     * - `generateSign` should got called
     */
    it('handleCommitment should call with no error', async () => {
      // mock test data
      const box1Hex =
        '80a8d6b907100304000e20a6ac381e6fa99929fd1477b3ba9499790a775e91d4c14c5aa86e9a118dfac8530400d801d601b2db6501fe730000ea02d1aedb63087201d901024d0e938c720201730198b2e4c672010510730200ade4c67201041ad901020ecdee72028cc10f00003a4f8dac9bbe80fffaf400edd5779b7ccd5628beceab06c41b5b7b3e091e963501';
      const dataBoxHex =
        '80ade2041006040004000400040004000402d804d601b2a5730000d602e4c6a7041ad603e4c6a70510d604ad7202d901040ecdee7204ea02d19683020193c27201c2a7938cb2db63087201730100018cb2db6308a773020001eb02ea02d19683020193e4c67201041a720293e4c672010510720398b2e4c6b2db6501fe7303000510730400720498b2720373050072048cc10f01a6ac381e6fa99929fd1477b3ba9499790a775e91d4c14c5aa86e9a118dfac85301021a0421028d938d67befbb8ab3513c44886c16c2bcd62ed4595b9b216b20ef03eb8fb8fb82103074e09c476bb215dc3aeff908d0b7691895a99dfc3bd950fa629defe541e0364210300e8750a242ee7d78f5b458e1f7474bd884d2b7894676412ba6b5f319d2ee41021023a5b48c87cd9fece23f5acd08cb464ceb9d76e3c1ddac08206980a295546bb2e100206081d827c338829135cc5c7d7f03ad9ba8ecffc6f5cddf63a2655c55922786230c000';
      const box1 = wasm.ErgoBox.sigma_parse_bytes(
        Uint8Array.from(Buffer.from(box1Hex, 'hex'))
      );
      const dataBox = wasm.ErgoBox.sigma_parse_bytes(
        Uint8Array.from(Buffer.from(dataBoxHex, 'hex'))
      );
      // mock `getQueuedTransaction`
      const handler = await generateMultiSigHandlerInstance(
        '5bc1d17d0612e696a9138ab8e85ca2a02d0171440ec128a9ad557c28bd5ea046'
      );
      const obj = {
        transaction: {
          boxes: [box1],
          dataBoxes: [dataBox],
          commitments: [undefined],
          commitmentSigns: [''],
          createTime: 0,
          requiredSigner: 2,
        },
        release: () => null,
      };
      vi.spyOn(handler, 'getQueuedTransaction').mockResolvedValue(obj);

      // mock `generateSign`
      const mockedGenerateSign = vi.fn();
      vi.spyOn(handler, 'generateSign').mockImplementation(mockedGenerateSign);

      // run test
      await handler.handleCommitment(
        'sender',
        {
          commitment: { index: [{ a: '3', position: '1-1' }] },
          txId: 'txid',
          index: 1,
        },
        'sign'
      );

      // `generateSign` should got called
      expect(mockedGenerateSign).toHaveBeenCalledWith('txid', obj.transaction);
    });
  });

  describe('cleanup', () => {
    beforeAll(() => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date(TestConfigs.currentTimeStamp));
    });

    afterAll(() => {
      vi.useRealTimers();
    });

    /**
     * @target MultiSigHandler.cleanup should remove
     * transactions that are timeout
     * @dependencies
     * - Date
     * @scenario
     * - mock two transactions (one after 3 seconds)
     * - run test
     * - check mocked transactions
     * @expected
     * - timeout transaction should not exist in queue
     * - other transaction should still be in queue
     */
    it('should remove transactions that are timeout', async () => {
      // mock two transactions
      const handler = await generateMultiSigHandlerInstance(
        '5bc1d17d0612e696a9138ab8e85ca2a02d0171440ec128a9ad557c28bd5ea046'
      );
      const tx1 = await handler.getQueuedTransaction('tx1');
      tx1.release();
      vi.advanceTimersByTime(3000);
      const tx2 = await handler.getQueuedTransaction('tx2');
      tx2.release();

      // run test
      handler.cleanup();

      // timeout transaction should not exist in queue
      const tx3 = await handler.getQueuedTransaction('tx1');
      tx3.release();
      expect(tx3.transaction).not.toEqual(tx1.transaction);

      // other transaction should still be in queue
      const tx4 = await handler.getQueuedTransaction('tx2');
      tx4.release();
      expect(tx4.transaction).toEqual(tx2.transaction);
    });
  });

  describe('verifySignedPayload', () => {
    beforeAll(() => {
      MultiSigUtils.getInstance().init(async () => {
        return mockedErgoStateContext;
      });
    });

    /**
     * @target MultiSigHandler.verifySignedPayload should throw error
     * when used commitment and stored commitment are different
     * @dependencies
     * - MultiSigUtils
     * @scenario
     * - mock test data
     * - run test and expect exception thrown
     * @expected
     * - should throw `CommitmentMisMatch` error
     */
    it('should throw error when used commitment and stored commitment are different', async () => {
      // mock test data
      const tx = mockPartialSignedTransaction();
      const transaction = {
        boxes: tx.inputBoxes,
        dataBoxes: [],
        commitments: [],
        commitmentSigns: ['sign'],
        createTime: 0,
        requiredSigner: 2,
        sign: {
          signed: ['sign'],
          simulated: ['simulated'],
          transaction: new Uint8Array([2]),
        },
        secret: tx.commitments[1],
      };
      const publishedCommitmentFirst =
        MultiSigUtils.generatedCommitmentToPublishCommitment(
          tx.commitments[0].to_json()
        );
      const publishedCommitmentSecond =
        MultiSigUtils.generatedCommitmentToPublishCommitment(
          tx.commitments[1].to_json()
        );

      // Changing publishedCommitment
      publishedCommitmentSecond[0][0].a = '11';

      const payload = {
        commitments: [
          { index: 0, sign: 'sign', commitment: publishedCommitmentFirst },
          { index: 1, sign: 'sign', commitment: publishedCommitmentSecond },
        ],
        signed: [publicKeys[0]],
        simulated: [publicKeys[1]],
        tx: Buffer.from(tx.transaction.sigma_serialize_bytes()).toString(
          'base64'
        ),
        txId: 'txid',
      };

      // run test and expect exception thrown
      const handler = await generateMultiSigHandlerInstance(
        '5bc1d17d0612e696a9138ab8e85ca2a02d0171440ec128a9ad557c28bd5ea046',
        publicKeys.slice(0, 2)
      );
      await expect(async () => {
        await handler.verifySignedPayload(transaction, payload);
      }).rejects.toThrow(CommitmentMisMatch);
    });

    /**
     * @target MultiSigHandler.verifySignedPayload should throw error
     * when stored commitment and transaction commitments are different
     * @dependencies
     * - MultiSigUtils
     * @scenario
     * - mock test data
     * - run test and expect exception thrown
     * @expected
     * - should throw `CommitmentMisMatch` error
     */
    it('should throw error when stored commitment and transaction commitments are different', async () => {
      const tx = mockPartialSignedTransaction();
      const publishedCommitmentFirst =
        MultiSigUtils.generatedCommitmentToPublishCommitment(
          tx.commitments[0].to_json()
        );
      const firstCommitmentPayload =
        MultiSigUtils.generatedCommitmentToPublishCommitment(
          tx.commitments[0].to_json()
        );
      const publishedCommitmentSecond =
        MultiSigUtils.generatedCommitmentToPublishCommitment(
          tx.commitments[1].to_json()
        );

      const transaction = {
        boxes: tx.inputBoxes,
        dataBoxes: [],
        commitments: [publishedCommitmentFirst, publishedCommitmentSecond],
        commitmentSigns: ['sign'],
        createTime: 0,
        requiredSigner: 2,
        sign: {
          signed: ['sign'],
          simulated: ['simulated'],
          transaction: new Uint8Array([2]),
        },
      };

      // Changing publishedCommitment
      firstCommitmentPayload[0][0].a = '11';

      const payload = {
        commitments: [
          { index: 0, sign: 'sign', commitment: firstCommitmentPayload },
          { index: 1, sign: 'sign', commitment: publishedCommitmentSecond },
        ],
        signed: [publicKeys[0]],
        simulated: [publicKeys[1]],
        tx: Buffer.from(tx.transaction.sigma_serialize_bytes()).toString(
          'base64'
        ),
        txId: 'txid',
      };

      // run test and expect exception thrown
      const handler = await generateMultiSigHandlerInstance(
        '5bc1d17d0612e696a9138ab8e85ca2a02d0171440ec128a9ad557c28bd5ea046',
        publicKeys.slice(0, 2)
      );
      await expect(async () => {
        await handler.verifySignedPayload(transaction, payload);
      }).rejects.toThrow(CommitmentMisMatch);
    });

    /**
     * @target MultiSigHandler.verifySignedPayload should throw error
     * when signed commitments and passed commitments are different
     * @dependencies
     * - MultiSigUtils
     * @scenario
     * - mock test data
     * - run test and expect exception thrown
     * @expected
     * - should throw `CommitmentMisMatch` error
     */
    it('should throw error when signed commitments and passed commitments are different', async () => {
      const tx = mockPartialSignedTransaction();
      const transaction = {
        boxes: tx.inputBoxes,
        dataBoxes: [],
        commitments: [],
        commitmentSigns: ['sign'],
        createTime: 0,
        requiredSigner: 2,
        sign: {
          signed: ['sign'],
          simulated: ['simulated'],
          transaction: new Uint8Array([2]),
        },
      };
      const publishedCommitmentFirst =
        MultiSigUtils.generatedCommitmentToPublishCommitment(
          tx.commitments[0].to_json()
        );
      const publishedCommitmentSecond =
        MultiSigUtils.generatedCommitmentToPublishCommitment(
          tx.commitments[1].to_json()
        );

      // Changing publishedCommitment
      publishedCommitmentFirst[0][0].a = '11';

      const payload = {
        commitments: [
          { index: 0, sign: 'sign', commitment: publishedCommitmentFirst },
          { index: 1, sign: 'sign', commitment: publishedCommitmentSecond },
        ],
        signed: [publicKeys[0]],
        simulated: [publicKeys[1]],
        tx: Buffer.from(tx.transaction.sigma_serialize_bytes()).toString(
          'base64'
        ),
        txId: 'txid',
      };

      // run test and expect exception thrown
      const handler = await generateMultiSigHandlerInstance(
        '168e8fee8ac6965832d6c1c17cdf60c1b582b09f293d8bd88231e32740e3b24f',
        publicKeys.slice(0, 2)
      );
      await expect(async () => {
        await handler.verifySignedPayload(transaction, payload);
      }).rejects.toThrow(CommitmentMisMatch);
    });

    /**
     * @target MultiSigHandler.verifySignedPayload should not throw any error
     * when transaction needs sign and commitments are correct
     * @dependencies
     * - MultiSigUtils
     * @scenario
     * - mock test data
     * - run test
     * @expected
     * - only no error throws
     */
    it('should not throw any error when when transaction needs sign and commitments are correct', async () => {
      // mock test data
      const tx = mockPartialSignedTransaction();
      const publishedCommitment =
        MultiSigUtils.generatedCommitmentToPublishCommitment(
          tx.commitments[0].to_json()
        );

      const transaction = {
        boxes: tx.inputBoxes,
        dataBoxes: [],
        commitments: [publishedCommitment, undefined],
        commitmentSigns: ['sign'],
        createTime: 0,
        requiredSigner: 2,
        sign: {
          signed: ['sign'],
          simulated: ['simulated'],
          transaction: new Uint8Array([2]),
        },
      };
      const publishedCommitmentFirst =
        MultiSigUtils.generatedCommitmentToPublishCommitment(
          tx.commitments[0].to_json()
        );
      const publishedCommitmentSecond =
        MultiSigUtils.generatedCommitmentToPublishCommitment(
          tx.commitments[1].to_json()
        );
      const payload = {
        commitments: [
          { index: 0, sign: 'sign', commitment: publishedCommitmentFirst },
          { index: 1, sign: 'sign', commitment: publishedCommitmentSecond },
        ],
        signed: [publicKeys[0]],
        simulated: [publicKeys[1]],
        tx: Buffer.from(tx.transaction.sigma_serialize_bytes()).toString(
          'base64'
        ),
        txId: 'txid',
      };

      // run test
      const handler = await generateMultiSigHandlerInstance(
        '168e8fee8ac6965832d6c1c17cdf60c1b582b09f293d8bd88231e32740e3b24f',
        publicKeys.slice(0, 2)
      );
      await handler.verifySignedPayload(transaction, payload);
    });

    /**
     * @target MultiSigHandler.verifySignedPayload should not throw any error
     * when transaction does not need sign
     * @dependencies
     * - MultiSigUtils
     * @scenario
     * - mock test data
     * - run test
     * @expected
     * - only no error throws
     */
    it('should not throw any error when transaction does not need sign', async () => {
      // mock test data
      const tx = mockPartialSignedTransaction();
      const publishedCommitmentSecond =
        MultiSigUtils.generatedCommitmentToPublishCommitment(
          tx.commitments[1].to_json()
        );

      const transaction = {
        boxes: tx.inputBoxes,
        dataBoxes: [],
        commitments: [undefined, publishedCommitmentSecond],
        commitmentSigns: ['sign'],
        createTime: 0,
        requiredSigner: 2,
        sign: {
          signed: [publicKeys[0]],
          simulated: [publicKeys[1]],
          transaction: new Uint8Array([2]),
        },
      };
      const publishedCommitmentFirst =
        MultiSigUtils.generatedCommitmentToPublishCommitment(
          tx.commitments[0].to_json()
        );
      const payload = {
        commitments: [
          { index: 0, sign: 'sign', commitment: publishedCommitmentFirst },
          { index: 1, sign: 'sign', commitment: publishedCommitmentSecond },
        ],
        signed: [publicKeys[0]],
        simulated: [publicKeys[1]],
        tx: Buffer.from(tx.transaction.sigma_serialize_bytes()).toString(
          'base64'
        ),
        txId: 'txid',
      };

      // run test
      const handler = await generateMultiSigHandlerInstance(
        '168e8fee8ac6965832d6c1c17cdf60c1b582b09f293d8bd88231e32740e3b24f',
        publicKeys.slice(0, 2)
      );
      await handler.verifySignedPayload(transaction, payload);
    });
  });
});
