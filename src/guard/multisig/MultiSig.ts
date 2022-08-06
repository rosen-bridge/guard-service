import * as wasm from 'ergo-lib-wasm-nodejs';
import {
    ApprovePayload, CommitmentJson,
    CommitmentPayload,
    CommunicationMessage,
    RegisterPayload,
    Signer, SignPayload,
    TxQueued
} from "./Interfaces";
import * as crypto from "crypto";
import Dialer from "../../communication/Dialer";
import Configs from "../../helpers/Configs";
import { Semaphore } from 'await-semaphore';
import Encryption from '../../helpers/Encryption';
import MultiSigUtils from "./MultiSigUtils";

const dialer = await Dialer.getInstance();

class MultiSigHandler{
    private static CHANNEL = "multi-sig"
    private readonly transactions: Map<string, TxQueued>
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
        this.peers = publicKeys.map(item => ({
            pub: item,
            unapproved: [],
        }));
        dialer.subscribeChannel(MultiSigHandler.CHANNEL, this.handleMessage);
        this.secret = secretHex ? Uint8Array.from(Buffer.from(secretHex, "hex")) : Configs.secret
    }

    /**
     * getting the singleton instance of the class
     * @param publicKeys
     * @param secretHex
     */
    public static getInstance = (publicKeys: Array<string>, secretHex?: string) => {
        if (!MultiSigHandler.instance) {
            MultiSigHandler.instance = new MultiSigHandler(publicKeys, secretHex);
            MultiSigHandler.instance.sendRegister().then(() => null)
        }
        return MultiSigHandler.instance;
    }

    /**
     * sending register message to the network
     */
    public sendRegister = async (): Promise<void> => {
        this.nonce = crypto.randomBytes(32).toString("base64");
        this.sendMessage({
            type: "register",
            payload: {
                nonce: this.nonce,
                myId: dialer.getPeerId(),
            }
        })
    }

    /**
     * getting the index of the guard
     */
    getIndex = (): number => {
        if (this.index === undefined) {
            const ergoTree = wasm.SecretKey.dlog_from_bytes(this.secret).get_address().to_ergo_tree().to_base16_bytes();
            const publicKey = ergoTree.substring(ergoTree.length - 66);
            this.index = this.peers.map((peer, index) => [peer.pub, index]).filter(row => row[0] === publicKey)[0][1] as number
        }
        if (this.index !== undefined)
            return this.index;
        throw Error("My index not found in guard public keys")
    }

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
            this.getQueuedTransaction(tx.unsigned_tx().id().to_str()).then(transaction => {
                transaction.tx = tx;
                transaction.boxes = boxes;
                transaction.dataBoxes = dataBoxes ? dataBoxes : [];
                transaction.resolve = resolve;
                transaction.reject = reject;
                transaction.requiredSigner = requiredSign;
                this.generateCommitment(tx.unsigned_tx().id().to_str())
            }).catch((e) => {
                reject(e)
            })
        })
    }

    /**
     * get my peer id
     */
    getPeerId = (): string => {
        const peerId = dialer.getPeerId();
        if (this.peerId !== peerId) {
            // TODO must call all other guards to update peerId
        }
        return peerId;
    }

    /**
     * cleaning unsigned transaction after multiSigTimeout if the transaction still exist in queue
     */
    cleanup = (): void => {
        this.semaphore.acquire().then(release => {
            try {
                for (const [key, transaction] of this.transactions.entries()) {
                    if (transaction.createTime < new Date().getTime() - Configs.multiSigTimeout) {
                        if (transaction.reject) {
                            transaction.reject("Timed out")
                        }
                        this.transactions.delete(key)
                    }
                }
                release()
            } catch (e) {
                release()
                throw e
            }
        })
    }

    /**
     * getting prover that makes with guard secrets
     */
    getProver = (): wasm.Wallet => {
        if (!this.prover) {
            const secret = wasm.SecretKey.dlog_from_bytes(this.secret)
            const secretKeys = new wasm.SecretKeys();
            secretKeys.add(secret)
            this.prover = wasm.Wallet.from_secrets(secretKeys)
        }
        if (this.prover)
            return this.prover;
        throw Error("Can not create prover")
    }

    /**
     * checks index of the tx is valid
     * @param index
     */
    verifyIndex = (index: number): boolean => {
        return index >= 0 && index < this.peers.length;
    }

    /**
     * generating commitment for transaction in the queue by id
     * @param id
     */
    generateCommitment = (id: string): void => {
        const queued = this.transactions.get(id)
        if (queued && !queued.secret && queued.tx) {
            queued.secret = this.getProver().generate_commitments_for_reduced_transaction(queued.tx)
            // publish commitment
            const commitmentJson: CommitmentJson = queued.secret.to_json() as CommitmentJson;
            const publicHints = commitmentJson.publicHints
            const publishCommitments: { [index: string]: Array<{ a: string; position: string }> } = {}
            Object.keys(publicHints).forEach(inputIndex => {
                const inputHints = publicHints[inputIndex].filter(item => !item.secret);
                if (inputHints) {
                    publishCommitments[inputIndex] = inputHints.map(item => ({"a": item.a, position: item.position}))
                }
            })
            this.sendMessage({
                type: "commitment",
                payload: {
                    txId: id,
                    commitment: publishCommitments
                }
            }, this.peers.map(item => item.id ? item.id : "").filter(item => item !== ""))
        }
    }

    /**
     * generating sign for transaction in the queue by the id of the transaction
     * @param id
     */
    generateSign = (id: string): void => {
        const prover = this.getProver();
        let needSign = false;
        this.getQueuedTransaction(id).then(async (transaction) => {
            if (transaction.tx && transaction.secret) {
                const myPub = this.peers[this.getIndex()].pub
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
                        )
                        signed = [myPub, ...signed]
                        needSign = true
                    }
                } else {
                    simulated = transaction.commitments.map((item, index) => {
                        if (item === undefined) {
                            return this.peers[index].pub
                        }
                        return ""
                    }).filter(item => !!item && item !== myPub)
                    signed = [myPub]
                    needSign = true
                }
                if (needSign) {
                    MultiSigUtils.add_hints(hints, transaction.secret, transaction.tx)
                    for (let index = 0; index < transaction.commitments.length; index++) {
                        const commitment = transaction.commitments[index];
                        if (commitment && this.peers.length > index) {
                            const peer = this.peers[index];
                            if (signed.indexOf(this.peers[index].pub) === -1) {
                                const publicHints = MultiSigUtils.convertToHintBag(commitment, peer.pub)
                                MultiSigUtils.add_hints(hints, publicHints, transaction.tx)
                            }
                        }
                    }
                    try {
                        const signedTx = prover.sign_reduced_transaction_multi(transaction.tx, hints)
                        const tx = Buffer.from(signedTx.sigma_serialize_bytes()).toString("base64")
                        // broadcast signed invalid transaction to all other
                        const payload: SignPayload = {
                            tx: tx,
                            txId: signedTx.id().to_str(),
                            signed: signed,
                            simulated: simulated
                        }
                        const peers = this.peers.filter(item => {
                            return simulated.indexOf(item.pub) === -1
                        }).map(item => item.id ? item.id : "").filter(item => item !== "")
                        this.sendMessage({type: "sign", payload: payload}, peers)
                        if (signed.length >= transaction.requiredSigner && transaction.resolve) {
                            transaction.resolve(signedTx)
                        }
                    } catch (e) {
                        console.log(`An error occurred during generate sign: ${e}`)
                    }
                }
            }
        })
    }

    /**
     * send a message to other guards. it can be sent to all guards or specific guard
     * @param message message
     * @param receivers if set we sent to this list of guards only. otherwise, broadcast it.
     */
    sendMessage = (message: CommunicationMessage, receivers?: Array<string>): void => {
        const payload = message.payload;
        payload.index = this.getIndex();
        payload.id = this.getPeerId();
        const payloadStr = JSON.stringify(message.payload)
        message.sign = Buffer.from(Encryption.sign(payloadStr, Buffer.from(this.secret))).toString("base64");
        if (receivers && receivers.length) {
            receivers.map(receiver => dialer.sendMessage(MultiSigHandler.CHANNEL, JSON.stringify(message), receiver).then(() => null))
        } else {
            dialer.sendMessage(MultiSigHandler.CHANNEL, JSON.stringify(message))
        }
    }

    /**
     * handle verified register message from other guards
     * @param sender
     * @param payload
     */
    handleRegister = (sender: string, payload: RegisterPayload): void => {
        if (payload.index !== undefined && this.verifyIndex(payload.index)) {
            const peer = this.peers[payload.index];
            const nonce = crypto.randomBytes(32).toString("base64");
            peer.unapproved.push({id: sender, challenge: nonce})
            this.sendMessage({
                type: "approve",
                sign: "",
                payload: {
                    nonce: payload.nonce,
                    nonceToSign: nonce,
                    myId: this.getPeerId()
                }
            })
        }
    }

    /**
     * handle verified approve message from other guards
     * @param sender
     * @param payload
     */
    handleApprove = (sender: string, payload: ApprovePayload): void => {
        if (payload.index !== undefined && this.verifyIndex(payload.index) && sender === payload.myId) {
            const nonce = payload.nonce;
            const peer = this.peers[payload.index];
            const unapproved = peer.unapproved.filter(item => item.id === sender && item.challenge === nonce)
            if (unapproved.length > 0) {
                peer.id = sender;
                peer.unapproved = peer.unapproved.filter(item => unapproved.indexOf(item) === -1)
            } else if (this.nonce == payload.nonce) {
                peer.id = sender;
            }
            if (payload.nonceToSign) {
                this.sendMessage({
                    type: "approve",
                    sign: "",
                    payload: {
                        nonce: payload.nonceToSign,
                        myId: this.getPeerId(),
                        nonceToSign: ""
                    }
                })
            }
        }
    }

    /**
     * get a transaction object from queued transactions.
     * @param txId
     */
    getQueuedTransaction = (txId: string): Promise<TxQueued> => {
        return this.semaphore.acquire().then(release => {
            try {
                const transaction = this.transactions.get(txId);
                if (transaction) {
                    release()
                    return transaction
                }
                const newTransaction: TxQueued = {
                    boxes: [],
                    dataBoxes: [],
                    commitments: this.peers.map(() => undefined),
                    createTime: new Date().getTime(),
                    requiredSigner: 0,
                }
                this.transactions.set(txId, newTransaction);
                release()
                return newTransaction;
            } catch (e) {
                release()
                throw e
            }
        })
    }

    /**
     * handle verified commitment message from other guards
     * @param sender
     * @param payload
     */
    handleCommitment = (sender: string, payload: CommitmentPayload): void => {
        if (payload.index !== undefined && payload.txId) {
            const index = payload.index
            this.getQueuedTransaction(payload.txId).then(transaction => {
                transaction.commitments[index] = payload.commitment;
                if (transaction.requiredSigner > 0) {
                    if (transaction.commitments.filter(item => item !== undefined).length >= transaction.requiredSigner - 1) {
                        this.generateSign(payload.txId);
                    }
                }
            })
        }
    }

    /**
     * handle verified sign message from other guards
     * @param sender
     * @param payload
     */
    handleSign = (sender: string, payload: SignPayload): void => {
        if (payload.txId) {
            this.getQueuedTransaction(payload.txId).then(transaction => {
                const myPub = this.peers[this.getIndex()].pub
                let updateSign = true;
                if (transaction.sign) {
                    if (payload.signed.filter(item => item !== myPub).length <= transaction.sign.signed.filter(item => item !== myPub).length) {
                        updateSign = false
                    }
                }
                if (updateSign) {
                    // no signed data. we store this data
                    transaction.sign = {
                        signed: payload.signed,
                        simulated: payload.simulated,
                        transaction: Uint8Array.from(Buffer.from(payload.tx, "base64"))
                    }
                }
                if (transaction.sign?.signed.indexOf(myPub) === -1) {
                    this.generateSign(payload.txId)
                }
            })
        }
    }

    /**
     * handle new message from other guards. first verify message sign
     * then if sign is valid pass to handler message according to message.type
     * @param messageStr
     * @param channel
     * @param sender
     */
    handleMessage = (messageStr: string, channel: string, sender: string): void => {
        const message = JSON.parse(messageStr) as CommunicationMessage;
        if (message.payload.index !== undefined && message.payload.index >= 0 && message.payload.index < this.peers.length && message.payload.id && message.sign) {
            if (sender !== message.payload.id) {
                return
            }
            const index = message.payload.index;
            const publicKey = Buffer.from(this.peers[index].pub, "hex");
            const signature = Buffer.from(message.sign, "base64");
            // verify signature
            const payloadStr = JSON.stringify(message.payload);
            if (Encryption.verify(payloadStr, signature, publicKey)) {
                switch (message.type) {
                    case "register":
                        this.handleRegister(sender, message.payload as RegisterPayload)
                        break;
                    case "approve":
                        this.handleApprove(sender, message.payload as ApprovePayload)
                        break;
                    case "commitment":
                        this.handleCommitment(sender, message.payload as CommitmentPayload)
                        break
                    case "sign":
                        this.handleSign(sender, message.payload as SignPayload)
                        break
                }
            }
        }
    }
}

export {
    MultiSigHandler
}
