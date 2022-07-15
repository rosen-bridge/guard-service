interface GuardInfo {
    guardId: number
    guardPubKey: string
}

interface AgreementPayload {
    guardId: number
    signature: string
}

interface CandidateTransaction extends AgreementPayload {
    txJson: string,
}

interface GuardsAgreement extends AgreementPayload {
    txId: string,
    agreed: boolean
}

interface TransactionApproved {
    txId: string,
    guardsSignatures: AgreementPayload[]
}

interface AgreementMessage {
    type: "request" | "response" | "approval"
    payload: AgreementPayload | TransactionApproved
}

export type {
    GuardInfo,
    AgreementPayload,
    CandidateTransaction,
    GuardsAgreement,
    TransactionApproved,
    AgreementMessage
}
