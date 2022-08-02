import { MultiSigHandler } from "../../../src/guard/multisig/MultiSig";
import { expect } from "chai";
import sinon from 'sinon';
import {
    sendMessageBodyAndPayloadArguments,
} from "../../communication/mocked/MockedDialer";

const publicKeys = [
    '028d938d67befbb8ab3513c44886c16c2bcd62ed4595b9b216b20ef03eb8fb8fb8',
    '03074e09c476bb215dc3aeff908d0b7691895a99dfc3bd950fa629defe541e0364',
    '0300e8750a242ee7d78f5b458e1f7474bd884d2b7894676412ba6b5f319d2ee410',
    '023a5b48c87cd9fece23f5acd08cb464ceb9d76e3c1ddac08206980a295546bb2e',
]

describe("MultiSigHandler", () => {
    describe("sendMessage", () => {
        it("", () => {
            const handler = new MultiSigHandler(publicKeys, "5bc1d17d0612e696a9138ab8e85ca2a02d0171440ec128a9ad557c28bd5ea046")
            sendMessageBodyAndPayloadArguments(['sign'], ['index', 'id', 'nonce', 'myId'])
            handler.sendMessage({
                type: "approve",
                payload: {
                    nonce: "nonce",
                    myId: "peerId",
                    nonceToSign: "nonceToSign"
                }
            })
        })
    })

    describe("getIndex", () => {
        it("checks index should be 0", () => {
            const handler = new MultiSigHandler(publicKeys, "5bc1d17d0612e696a9138ab8e85ca2a02d0171440ec128a9ad557c28bd5ea046")
            expect(handler.getIndex()).to.be.equal(0);
        })
    })

    describe("getProver", () => {
        it("should return prover with no error", () => {
            const handler = new MultiSigHandler(publicKeys, "5bc1d17d0612e696a9138ab8e85ca2a02d0171440ec128a9ad557c28bd5ea046")
            const wallet = handler.getProver();
        })
    })

    describe("handleApprove", () => {
        it("", () => {
            const handler = new MultiSigHandler(publicKeys, "5bc1d17d0612e696a9138ab8e85ca2a02d0171440ec128a9ad557c28bd5ea046")
            handler.handleApprove('sender', {nonce: 'nonce', myId: "myId"})
        })
    })

    describe("handleMessage", () => {
        it("commitment", () => {
            const handler = new MultiSigHandler(
                publicKeys,
                "168e8fee8ac6965832d6c1c17cdf60c1b582b09f293d8bd88231e32740e3b24f"
            )
            const message = '{"type":"commitment","payload":{"txId":"356ebd85f01ee25c3c241950b77d533ee46bcdc7c3a02a2f24bb25946b9fec96","commitment":{"0":[{"a":"02acf3bf8466386df1cedca127ac8e025223ce1f88f430fc6f1dfabc424857e15c","position":"0-1"}]},"index":1,"id":"12D3KooWSC69DeYqzwjeDYFFXqEgNPUvDxVaypezZpkUXVA8UkR2"},"sign":"+nHOaX5etrB+JI3tMa+EfSsBX7tBKhALubQ7D3iLl4VuzsXFOFfkgpas8tPm5/nrElGW5Y4CpzB+DuWAEvK1sA=="}';
            const spiedCommitment = sinon.spy(handler, "handleCommitment");
            const spiedSign = sinon.spy(handler, "handleSign");
            const spiedRegister = sinon.spy(handler, "handleRegister");
            const spiedApprove = sinon.spy(handler, "handleApprove");
            handler.handleMessage(
                message,
                'multi-sig',
                "12D3KooWSC69DeYqzwjeDYFFXqEgNPUvDxVaypezZpkUXVA8UkR2"
            )
            expect(spiedCommitment.calledOnce).to.be.true;
            expect(spiedSign.called).to.be.false;
            expect(spiedApprove.called).to.be.false;
            expect(spiedRegister.called).to.be.false;
        })
        it("approve", () => {
            const handler = new MultiSigHandler(
                publicKeys,
                "168e8fee8ac6965832d6c1c17cdf60c1b582b09f293d8bd88231e32740e3b24f"
            )
            const message = '{"type":"approve","payload":{"txId":"356ebd85f01ee25c3c241950b77d533ee46bcdc7c3a02a2f24bb25946b9fec96","commitment":{"0":[{"a":"02acf3bf8466386df1cedca127ac8e025223ce1f88f430fc6f1dfabc424857e15c","position":"0-1"}]},"index":1,"id":"12D3KooWSC69DeYqzwjeDYFFXqEgNPUvDxVaypezZpkUXVA8UkR2"},"sign":"+nHOaX5etrB+JI3tMa+EfSsBX7tBKhALubQ7D3iLl4VuzsXFOFfkgpas8tPm5/nrElGW5Y4CpzB+DuWAEvK1sA=="}';
            const spiedCommitment = sinon.spy(handler, "handleCommitment");
            const spiedSign = sinon.spy(handler, "handleSign");
            const spiedRegister = sinon.spy(handler, "handleRegister");
            const spiedApprove = sinon.spy(handler, "handleApprove");
            handler.handleMessage(
                message,
                'multi-sig',
                "12D3KooWSC69DeYqzwjeDYFFXqEgNPUvDxVaypezZpkUXVA8UkR2"
            )
            expect(spiedApprove.calledOnce).to.be.true;
            expect(spiedSign.called).to.be.false;
            expect(spiedCommitment.called).to.be.false;
            expect(spiedRegister.called).to.be.false;
        })
        it("register", () => {
            const handler = new MultiSigHandler(
                publicKeys,
                "168e8fee8ac6965832d6c1c17cdf60c1b582b09f293d8bd88231e32740e3b24f"
            )
            const message = '{"type":"register","payload":{"txId":"356ebd85f01ee25c3c241950b77d533ee46bcdc7c3a02a2f24bb25946b9fec96","commitment":{"0":[{"a":"02acf3bf8466386df1cedca127ac8e025223ce1f88f430fc6f1dfabc424857e15c","position":"0-1"}]},"index":1,"id":"12D3KooWSC69DeYqzwjeDYFFXqEgNPUvDxVaypezZpkUXVA8UkR2"},"sign":"+nHOaX5etrB+JI3tMa+EfSsBX7tBKhALubQ7D3iLl4VuzsXFOFfkgpas8tPm5/nrElGW5Y4CpzB+DuWAEvK1sA=="}';
            const spiedCommitment = sinon.spy(handler, "handleCommitment");
            const spiedSign = sinon.spy(handler, "handleSign");
            const spiedRegister = sinon.spy(handler, "handleRegister");
            const spiedApprove = sinon.spy(handler, "handleApprove");
            handler.handleMessage(
                message,
                'multi-sig',
                "12D3KooWSC69DeYqzwjeDYFFXqEgNPUvDxVaypezZpkUXVA8UkR2"
            )
            expect(spiedRegister.calledOnce).to.be.true;
            expect(spiedSign.called).to.be.false;
            expect(spiedCommitment.called).to.be.false;
            expect(spiedApprove.called).to.be.false;
        })
        it("sign", () => {
            const handler = new MultiSigHandler(
                publicKeys,
                "168e8fee8ac6965832d6c1c17cdf60c1b582b09f293d8bd88231e32740e3b24f"
            )
            const message = '{"type":"sign","payload":{"txId":"356ebd85f01ee25c3c241950b77d533ee46bcdc7c3a02a2f24bb25946b9fec96","commitment":{"0":[{"a":"02acf3bf8466386df1cedca127ac8e025223ce1f88f430fc6f1dfabc424857e15c","position":"0-1"}]},"index":1,"id":"12D3KooWSC69DeYqzwjeDYFFXqEgNPUvDxVaypezZpkUXVA8UkR2"},"sign":"+nHOaX5etrB+JI3tMa+EfSsBX7tBKhALubQ7D3iLl4VuzsXFOFfkgpas8tPm5/nrElGW5Y4CpzB+DuWAEvK1sA=="}';
            const spiedCommitment = sinon.spy(handler, "handleCommitment");
            const spiedSign = sinon.spy(handler, "handleSign");
            const spiedRegister = sinon.spy(handler, "handleRegister");
            const spiedApprove = sinon.spy(handler, "handleApprove");
            handler.handleMessage(
                message,
                'multi-sig',
                "12D3KooWSC69DeYqzwjeDYFFXqEgNPUvDxVaypezZpkUXVA8UkR2"
            )
            expect(spiedSign.calledOnce).to.be.true;
            expect(spiedApprove.called).to.be.false;
            expect(spiedCommitment.called).to.be.false;
            expect(spiedRegister.called).to.be.false;
        })

    })

    describe("getPeerId", () => {
        it("checks peerId should be peerId", () => {
            const handler = new MultiSigHandler(publicKeys, "5bc1d17d0612e696a9138ab8e85ca2a02d0171440ec128a9ad557c28bd5ea046")
            expect(handler.getPeerId()).to.be.eql("peerId");
        })
    })

})
