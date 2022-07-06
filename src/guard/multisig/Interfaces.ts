import * as wasm from "ergo-lib-wasm-nodejs";


interface Sign {
    signed: Array<string>;
    simulated: Array<string>;
    transaction: wasm.Transaction;
}

interface ApproveSigner {
    id: string;
    challenge: string;
}

interface Signer {
    id?: string;
    pub: string;
    unapproved: Array<ApproveSigner>;
}

interface SingleCommitmentJson {
    hint: string;
    pubkey: {
        op: string,
        h: string
    },
    type: string;
    a: string;
    secret?: string;
    position: string
}

interface CommitmentJson {
    secretHints: { [index: string]: Array<SingleCommitmentJson> }
    publicHints: { [index: string]: Array<SingleCommitmentJson> }
}

interface TxQueued {
    tx?: wasm.ReducedTransaction;
    boxes: Array<wasm.ErgoBox>;
    dataBoxes: Array<wasm.ErgoBox>;
    secret?: wasm.TransactionHintsBag;
    sign?: Sign;
    commitments: Array<PublishedCommitment | undefined>;
    resolve?: (value: (wasm.Transaction | PromiseLike<wasm.Transaction>)) => void;
    reject?: (reason?: never) => void;
    createTime: number;
}

interface GeneralPayload {
    index?: number;
    id?: string;
}

interface RegisterPayload extends GeneralPayload {
    nonce: string;
}

interface ApprovePayload extends GeneralPayload {
    nonce: string;
    nonceToSign?: string;
}

interface PublishedCommitment {
    [index: string]: {
        a: string;
        position: string
    }
}

interface CommitmentPayload extends GeneralPayload {
    txId: string;
    commitment: PublishedCommitment
}

interface SignPayload extends GeneralPayload {
    tx: string;
    txId: string;
    signed: Array<string>;
    simulated: Array<string>;
}

type Payload = RegisterPayload | ApprovePayload | CommitmentPayload | SignPayload;

interface CommunicationMessage {
    type: "register" | "approve" | "commitment" | "sign";
    sign?: string;
    payload: Payload;
}


export {
    TxQueued,
    CommunicationMessage,
    RegisterPayload,
    CommitmentPayload,
    SignPayload,
    Signer,
    ApprovePayload,
    CommitmentJson,
    PublishedCommitment,
}