import * as wasm from 'ergo-lib-wasm-nodejs';
import {
  ApprovePayload,
  CommitmentJson,
  CommitmentPayload,
  CommunicationMessage,
  RegisterPayload,
  Signer,
  SignPayload,
  TxQueued,
} from './Interfaces';
import * as crypto from 'crypto';
import Dialer from '../../communication/simple-http/Dialer';
import Configs from '../../helpers/Configs';
import { Semaphore } from 'await-semaphore';
import Encryption from '../../helpers/Encryption';
import MultiSigUtils from './MultiSigUtils';
import { logger } from '../../log/Logger';

const dialer = await Dialer.getInstance();

class MultiSigHandler {
  private static CHANNEL = 'multi-sig';
  private readonly transactions: Map<string, TxQueued>;
  private readonly peers: Array<Signer>;
  private readonly secret: Uint8Array;
  private nonce: string;
  private prover?: wasm.Wallet;
  private index?: number;
  private peerId?: string;
  private semaphore = new Semaphore(1);
  private static instance: MultiSigHandler;

  constructor(publicKeys: Array<string>, secretHex?: string) {
    this.transactions = new Map<string, TxQueued>();
    this.peers = publicKeys.map((item) => ({
      pub: item,
      unapproved: [],
    }));
    dialer.subscribe({
      channel: MultiSigHandler.CHANNEL,
      callback: this.handleMessage,
      id: 'MultiSig',
    });
    this.secret = secretHex
      ? Uint8Array.from(Buffer.from(secretHex, 'hex'))
      : Configs.secret;
  }

  /**
   * getting the singleton instance of the class
   * @param publicKeys
   * @param secretHex
   */
  public static getInstance = (
    publicKeys: Array<string>,
    secretHex?: string
  ) => {
    if (!MultiSigHandler.instance) {
      MultiSigHandler.instance = new MultiSigHandler(publicKeys, secretHex);
      MultiSigHandler.instance.sendRegister().then(() => null);
    }
    return MultiSigHandler.instance;
  };

  /**
   * sending register message to the network
   */
  public sendRegister = async (): Promise<void> => {
    this.nonce = crypto.randomBytes(32).toString('base64');
    this.sendMessage({
      type: 'register',
      payload: {
        nonce: this.nonce,
        myId: dialer.getPeerId(),
      },
    });
  };

  /**
   * getting the index of the guard
   */
  getIndex = (): number => {
    if (this.index === undefined) {
      const ergoTree = wasm.SecretKey.dlog_from_bytes(this.secret)
        .get_address()
        .to_ergo_tree()
        .to_base16_bytes();
      const publicKey = ergoTree.substring(ergoTree.length - 66);
      this.index = this.peers
        .map((peer, index) => [peer.pub, index])
        .filter((row) => row[0] === publicKey)[0][1] as number;
    }
    if (this.index !== undefined) return this.index;
    throw Error('Secret key does not match with any guard public keys');
  };

  /**
   * begin sign a multi-sig transaction.
   * @param tx: reduced transaction for multi-sig transaction
   * @param requiredSign: number of required signs
   * @param boxes: input boxes for transaction
   * @param dataBoxes: data input boxes for transaction
   */
  public sign = (
    tx: wasm.ReducedTransaction,
    requiredSign: number,
    boxes: Array<wasm.ErgoBox>,
    dataBoxes?: Array<wasm.ErgoBox>
  ): Promise<wasm.Transaction> => {
    return new Promise<wasm.Transaction>((resolve, reject) => {
      this.getQueuedTransaction(tx.unsigned_tx().id().to_str())
        .then(({ transaction, release }) => {
          transaction.tx = tx;
          transaction.boxes = boxes;
          transaction.dataBoxes = dataBoxes ? dataBoxes : [];
          transaction.resolve = resolve;
          transaction.reject = reject;
          transaction.requiredSigner = requiredSign;
          this.generateCommitment(tx.unsigned_tx().id().to_str());
          release();
        })
        .catch((e) => {
          logger.error(`Error in signing MultiSig transaction: ${e}`);
          reject(e);
        });
    });
  };

  /**
   * get my peer id
   */
  getPeerId = (): string => {
    const peerId = dialer.getPeerId();
    if (this.peerId !== peerId) {
      // TODO must call all other guards to update peerId
      //  https://git.ergopool.io/ergo/rosen-bridge/ts-guard-service/-/issues/22
    }
    return peerId;
  };

  /**
   * verify that if selected guard sign message or not
   * @param signBase64: signed string encoded as base64
   * @param guardIndex: signed guard index
   * @param data: signed data
   */
  verifySign = (
    signBase64: string,
    guardIndex: number,
    data: string
  ): boolean => {
    const publicKey = Buffer.from(this.peers[guardIndex].pub, 'hex');
    const signature = Buffer.from(signBase64, 'base64');
    // verify signature
    return Encryption.verify(data, signature, publicKey);
  };

  /**
   * cleaning unsigned transaction after multiSigTimeout if the transaction still exist in queue
   */
  cleanup = (): void => {
    logger.info('Cleaning MultiSig queue');
    let cleanedTransactionCount = 0;
    this.semaphore.acquire().then((release) => {
      try {
        for (const [key, transaction] of this.transactions.entries()) {
          if (
            transaction.createTime <
            new Date().getTime() - Configs.multiSigTimeout * 1000
          ) {
            // milliseconds
            if (transaction.reject) {
              transaction.reject('Timed out');
            }
            this.transactions.delete(key);
            cleanedTransactionCount++;
          }
        }
        release();
      } catch (e) {
        release();
        logger.error(
          `An error occurred while removing unsigned transactions from MultiSig queue: ${e}`
        );
        throw e;
      }
      logger.info(`MultiSig queue cleaned up`, {
        count: cleanedTransactionCount,
      });
    });
  };

  /**
   * getting prover that makes with guard secrets
   */
  getProver = (): wasm.Wallet => {
    if (!this.prover) {
      const secret = wasm.SecretKey.dlog_from_bytes(this.secret);
      const secretKeys = new wasm.SecretKeys();
      secretKeys.add(secret);
      this.prover = wasm.Wallet.from_secrets(secretKeys);
    }
    if (this.prover) return this.prover;
    throw Error('Cannot create prover in MultiSig');
  };

  /**
   * checks index of the tx is valid
   * @param index
   */
  verifyIndex = (index: number): boolean => {
    return index >= 0 && index < this.peers.length;
  };

  /**
   * generating commitment for transaction in the queue by id
   * @param id
   */
  generateCommitment = (id: string): void => {
    const queued = this.transactions.get(id);
    if (queued && !queued.secret && queued.tx) {
      queued.secret =
        this.getProver().generate_commitments_for_reduced_transaction(
          queued.tx
        );
      // publish commitment
      const commitmentJson: CommitmentJson =
        queued.secret.to_json() as CommitmentJson;
      const publicHints = commitmentJson.publicHints;
      const publishCommitments: {
        [index: string]: Array<{ a: string; position: string }>;
      } = {};
      Object.keys(publicHints).forEach((inputIndex) => {
        const inputHints = publicHints[inputIndex].filter(
          (item) => !item.secret
        );
        if (inputHints) {
          publishCommitments[inputIndex] = inputHints.map((item) => ({
            a: item.a,
            position: item.position,
          }));
        }
      });
      this.sendMessage(
        {
          type: 'commitment',
          payload: {
            txId: id,
            commitment: publishCommitments,
          },
        },
        this.peers
          .map((item) => (item.id ? item.id : ''))
          .filter((item) => item !== '')
      );
    }
  };

  /**
   * process resolve transaction and call callback function
   * @param transaction
   */
  processResolve = (transaction: TxQueued) => {
    if (
      transaction.sign &&
      transaction.sign.signed.length >= transaction.requiredSigner &&
      transaction.tx
    ) {
      if (transaction.resolve) {
        transaction.resolve(
          wasm.Transaction.sigma_parse_bytes(transaction.sign.transaction)
        );
        // remove transaction from queue
        transaction.tx = undefined;
        transaction.sign = undefined;
        transaction.reject = undefined;
      } else {
        logger.warn(`No resolve method for transaction [${transaction}]`);
      }
    }
  };

  /**
   * generating sign for transaction in the queue by the id of the transaction
   * @param id
   * @param transaction
   */
  generateSign = async (id: string, transaction: TxQueued): Promise<void> => {
    const prover = this.getProver();
    let needSign = false;
    if (transaction.tx && transaction.secret) {
      const myPub = this.peers[this.getIndex()].pub;
      let signed: Array<string> = [];
      let simulated: Array<string> = [];
      let hints: wasm.TransactionHintsBag = wasm.TransactionHintsBag.empty();
      if (transaction.sign) {
        simulated = transaction.sign.simulated;
        signed = transaction.sign.signed;
        if (signed.indexOf(myPub) === -1) {
          hints = await MultiSigUtils.extract_hints(
            wasm.Transaction.sigma_parse_bytes(transaction.sign.transaction),
            transaction.boxes,
            transaction.dataBoxes,
            signed,
            simulated
          );
          signed = [myPub, ...signed];
          needSign = true;
        }
      } else {
        simulated = transaction.commitments
          .map((item, index) => {
            if (item === undefined) {
              return this.peers[index].pub;
            }
            return '';
          })
          .filter((item) => !!item && item !== myPub);
        // add extra simulated to list of simulated nodes. this is cause of sigma-rust bug
        const committed = transaction.commitments
          .map((item, index) => {
            if (item !== undefined) {
              return this.peers[index].pub;
            }
            return '';
          })
          .filter((item) => !!item && item !== myPub);
        if (committed.length > transaction.requiredSigner - 1) {
          simulated = [
            ...simulated,
            ...committed.slice(transaction.requiredSigner - 1),
          ];
        }
        signed = [myPub];
        needSign = true;
      }
      if (needSign) {
        MultiSigUtils.add_hints(hints, transaction.secret, transaction.tx);
        for (let index = 0; index < transaction.commitments.length; index++) {
          const commitment = transaction.commitments[index];
          if (commitment && this.peers.length > index) {
            const peer = this.peers[index];
            if (
              signed.indexOf(this.peers[index].pub) === -1 &&
              simulated.indexOf(this.peers[index].pub) === -1
            ) {
              const publicHints = MultiSigUtils.convertToHintBag(
                commitment,
                peer.pub
              );
              MultiSigUtils.add_hints(hints, publicHints, transaction.tx);
            }
          }
        }
        try {
          const signedTx = prover.sign_reduced_transaction_multi(
            transaction.tx,
            hints
          );
          const txBytes = Buffer.from(signedTx.sigma_serialize_bytes());
          // broadcast signed invalid transaction to all other
          const payload: SignPayload = {
            tx: txBytes.toString('base64'),
            txId: signedTx.id().to_str(),
            signed: signed,
            simulated: simulated,
            commitments: [],
          };
          const completed = signed.length >= transaction.requiredSigner;
          if (!completed) {
            transaction.commitments.map((item, index) => {
              const commitment = transaction.commitments[index];
              if (transaction.commitmentSigns[index] && commitment) {
                payload.commitments.push({
                  sign: transaction.commitmentSigns[index],
                  index: index,
                  commitment: commitment,
                });
              }
            });
          }
          const peers = this.peers
            .filter((item) => {
              return simulated.indexOf(item.pub) === -1 || completed; // if transaction sign completed we broadcast transaction to all peers not only signers
            })
            .map((item) => (item.id ? item.id : ''))
            .filter((item) => item !== '');
          this.sendMessage({ type: 'sign', payload: payload }, peers);
          transaction.sign = {
            signed: signed,
            simulated: simulated,
            transaction: txBytes,
          };
        } catch (e) {
          logger.warn(`An error occurred during MultiSig generate sign: ${e}`);
        }
      }
    }
  };

  /**
   * send a message to other guards. it can be sent to all guards or specific guard
   * @param message message
   * @param receivers if set we sent to this list of guards only. otherwise, broadcast it.
   */
  sendMessage = (
    message: CommunicationMessage,
    receivers?: Array<string>
  ): void => {
    const payload = message.payload;
    payload.index = this.getIndex();
    payload.id = this.getPeerId();
    const payloadStr = JSON.stringify(message.payload);
    message.sign = Buffer.from(
      Encryption.sign(payloadStr, Buffer.from(this.secret))
    ).toString('base64');
    if (receivers && receivers.length) {
      receivers.map((receiver) =>
        dialer
          .sendMessage(
            MultiSigHandler.CHANNEL,
            JSON.stringify(message),
            receiver
          )
          .then(() => null)
      );
    } else {
      dialer.sendMessage(MultiSigHandler.CHANNEL, JSON.stringify(message));
    }
  };

  /**
   * handle verified register message from other guards
   * @param sender
   * @param payload
   */
  handleRegister = (sender: string, payload: RegisterPayload): void => {
    if (payload.index !== undefined && this.verifyIndex(payload.index)) {
      const peer = this.peers[payload.index];
      const nonce = crypto.randomBytes(32).toString('base64');
      peer.unapproved.push({ id: sender, challenge: nonce });
      this.sendMessage(
        {
          type: 'approve',
          sign: '',
          payload: {
            nonce: payload.nonce,
            nonceToSign: nonce,
            myId: this.getPeerId(),
          },
        },
        [sender]
      );
    }
  };

  /**
   * handle verified approve message from other guards
   * @param sender
   * @param payload
   */
  handleApprove = (sender: string, payload: ApprovePayload): void => {
    if (
      payload.index !== undefined &&
      this.verifyIndex(payload.index) &&
      sender === payload.myId
    ) {
      const nonce = payload.nonce;
      const peer = this.peers[payload.index];
      const unapproved = peer.unapproved.filter(
        (item) => item.id === sender && item.challenge === nonce
      );
      if (unapproved.length > 0) {
        peer.id = sender;
        peer.unapproved = peer.unapproved.filter(
          (item) => unapproved.indexOf(item) === -1
        );
      } else if (this.nonce == payload.nonce) {
        peer.id = sender;
      }
      if (payload.nonceToSign) {
        this.sendMessage(
          {
            type: 'approve',
            sign: '',
            payload: {
              nonce: payload.nonceToSign,
              myId: this.getPeerId(),
              nonceToSign: '',
            },
          },
          [sender]
        );
      }
    }
  };

  /**
   * get a transaction object from queued transactions.
   * @param txId
   */
  getQueuedTransaction = (
    txId: string
  ): Promise<{ transaction: TxQueued; release: () => void }> => {
    return this.semaphore.acquire().then((release) => {
      try {
        const transaction = this.transactions.get(txId);
        if (transaction) {
          return { transaction, release };
        }
        const newTransaction: TxQueued = {
          boxes: [],
          dataBoxes: [],
          commitments: this.peers.map(() => undefined),
          commitmentSigns: this.peers.map(() => ''),
          createTime: new Date().getTime(),
          requiredSigner: 0,
        };
        this.transactions.set(txId, newTransaction);
        return { transaction: newTransaction, release };
      } catch (e) {
        release();
        throw e;
      }
    });
  };

  /**
   * handle verified commitment message from other guards
   * @param sender: sender for this commitment
   * @param payload: user commitment
   * @param sign: signature for this commitment message
   */
  handleCommitment = (
    sender: string,
    payload: CommitmentPayload,
    sign: string
  ): void => {
    if (payload.index !== undefined && payload.txId) {
      const index = payload.index;
      this.getQueuedTransaction(payload.txId).then(
        async ({ transaction, release }) => {
          try {
            transaction.commitments[index] = payload.commitment;
            transaction.commitmentSigns[index] = sign;
            if (transaction.requiredSigner > 0) {
              if (
                transaction.commitments.filter((item) => item !== undefined)
                  .length >=
                transaction.requiredSigner - 1
              ) {
                await this.generateSign(payload.txId, transaction);
              }
            }
            this.processResolve(transaction);
          } catch (e) {
            logger.warn(
              `An unknown exception occurred while handling commitment from other peer: ${e}`
            );
          }
        }
      );
    }
  };

  /**
   * handle verified sign message from other guards
   * @param sender
   * @param payload
   */
  handleSign = (sender: string, payload: SignPayload): void => {
    if (payload.txId) {
      this.getQueuedTransaction(payload.txId).then(
        async ({ transaction, release }) => {
          try {
            payload.commitments
              .filter((commitment) => {
                if (transaction.commitments[commitment.index] !== undefined) {
                  return false;
                }
                const payloadToSign = {
                  txId: payload.txId,
                  commitment: commitment.commitment,
                };
                return this.verifySign(
                  commitment.sign,
                  commitment.index,
                  JSON.stringify(payloadToSign)
                );
              })
              .forEach((commitment) => {
                transaction.commitments[commitment.index] =
                  commitment.commitment;
                transaction.commitmentSigns[commitment.index] = commitment.sign;
              });
            const guardsKeys = this.peers.map((item) => item.pub);
            payload.signed = Array.from(
              new Set(payload.signed).values()
            ).filter((item) => guardsKeys.indexOf(item) !== -1);
            payload.simulated = Array.from(
              new Set(payload.simulated).values()
            ).filter((item) => guardsKeys.indexOf(item) !== -1);
            const myPub = this.peers[this.getIndex()].pub;
            let updateSign = true;
            if (
              transaction.sign &&
              payload.signed.filter((item) => item !== myPub).length <=
                transaction.sign.signed.filter((item) => item !== myPub).length
            ) {
              updateSign = false;
            }
            if (updateSign) {
              // Arrived transaction is better and has more signatures. store it.
              transaction.sign = {
                signed: payload.signed,
                simulated: payload.simulated,
                transaction: Uint8Array.from(Buffer.from(payload.tx, 'base64')),
              };
            }
            if (
              transaction.sign &&
              transaction.sign.signed.indexOf(myPub) === -1 &&
              transaction.sign.simulated.indexOf(myPub) === -1 &&
              transaction.sign.signed.length < transaction.requiredSigner
            ) {
              await this.generateSign(payload.txId, transaction);
            }
            this.processResolve(transaction);
          } catch (e) {
            logger.warn(
              `An unknown exception occurred while handling sign from another peer: ${e}`
            );
          }
          release();
        }
      );
    }
  };

  /**
   * handle new message from other guards. first verify message sign
   * then if sign is valid pass to handler message according to message.type
   * @param messageStr
   * @param channel
   * @param sender
   */
  handleMessage = (
    messageStr: string,
    channel: string,
    sender: string
  ): void => {
    const message = JSON.parse(messageStr) as CommunicationMessage;
    if (
      message.payload.index !== undefined &&
      message.payload.index >= 0 &&
      message.payload.index < this.peers.length &&
      message.payload.id &&
      message.sign
    ) {
      if (sender !== message.payload.id) {
        return;
      }
      const index = message.payload.index;
      if (
        this.verifySign(message.sign, index, JSON.stringify(message.payload))
      ) {
        switch (message.type) {
          case 'register':
            this.handleRegister(sender, message.payload as RegisterPayload);
            break;
          case 'approve':
            this.handleApprove(sender, message.payload as ApprovePayload);
            break;
          case 'commitment':
            this.handleCommitment(
              sender,
              message.payload as CommitmentPayload,
              message.sign
            );
            break;
          case 'sign':
            this.handleSign(sender, message.payload as SignPayload);
            break;
        }
      } else {
        logger.warn(
          "Ignoring received message in MultiSig. Signature didn't verify"
        );
      }
    }
  };
}

export default MultiSigHandler;
