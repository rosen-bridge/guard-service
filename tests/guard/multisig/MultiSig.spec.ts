import { MultiSigHandler } from "../../../src/guard/multisig/MultiSig";
import { expect } from "chai";
import sinon from 'sinon';
import {
    sendMessageBodyAndPayloadArguments,
} from "../../communication/mocked/MockedDialer";
import * as wasm from 'ergo-lib-wasm-nodejs';
import exp from "constants";


const publicKeys = [
    '028d938d67befbb8ab3513c44886c16c2bcd62ed4595b9b216b20ef03eb8fb8fb8',
    '03074e09c476bb215dc3aeff908d0b7691895a99dfc3bd950fa629defe541e0364',
    '0300e8750a242ee7d78f5b458e1f7474bd884d2b7894676412ba6b5f319d2ee410',
    '023a5b48c87cd9fece23f5acd08cb464ceb9d76e3c1ddac08206980a295546bb2e',
]

describe("MultiSigHandler", () => {
    describe("sendMessage", () => {
        it("checks that correct message is sent over p2p or not", () => {
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
        it("checks handler approve called without error", () => {
            const handler = new MultiSigHandler(publicKeys, "5bc1d17d0612e696a9138ab8e85ca2a02d0171440ec128a9ad557c28bd5ea046")
            handler.handleApprove('sender', {index: 1, nonce: 'nonce', myId: "sender", nonceToSign: "1"});
            sendMessageBodyAndPayloadArguments(['type', 'sign', 'payload'], ['nonceToSign']);
        })
    })

    describe("handleMessage", () => {
        it("checks that handleCommitment should called", () => {
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
        it("checks that approve should called", () => {
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
        it("checks that register should called", () => {
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
        it("checks that sign should called", () => {
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

    describe("handleRegister", () => {
        it("checks that handle register called without error", () => {
            const handler = new MultiSigHandler(publicKeys, "5bc1d17d0612e696a9138ab8e85ca2a02d0171440ec128a9ad557c28bd5ea046")
            const spiedSendMessage = sinon.spy(handler, "sendMessage");
            handler.handleRegister('sender', {index: 1, nonce: 'nonce', myId: "myId"})
            expect(spiedSendMessage.calledOnce).to.be.true;
        })
    })

    describe("handleSign", () => {
        it("checks that handleSign called with no error", () => {
            const box1Hex = '80a8d6b907100304000e20a6ac381e6fa99929fd1477b3ba9499790a775e91d4c14c5aa86e9a118dfac8530400d801d601b2db6501fe730000ea02d1aedb63087201d901024d0e938c720201730198b2e4c672010510730200ade4c67201041ad901020ecdee72028cc10f00003a4f8dac9bbe80fffaf400edd5779b7ccd5628beceab06c41b5b7b3e091e963501'
            const dataBoxHex = '80ade2041006040004000400040004000402d804d601b2a5730000d602e4c6a7041ad603e4c6a70510d604ad7202d901040ecdee7204ea02d19683020193c27201c2a7938cb2db63087201730100018cb2db6308a773020001eb02ea02d19683020193e4c67201041a720293e4c672010510720398b2e4c6b2db6501fe7303000510730400720498b2720373050072048cc10f01a6ac381e6fa99929fd1477b3ba9499790a775e91d4c14c5aa86e9a118dfac85301021a0421028d938d67befbb8ab3513c44886c16c2bcd62ed4595b9b216b20ef03eb8fb8fb82103074e09c476bb215dc3aeff908d0b7691895a99dfc3bd950fa629defe541e0364210300e8750a242ee7d78f5b458e1f7474bd884d2b7894676412ba6b5f319d2ee41021023a5b48c87cd9fece23f5acd08cb464ceb9d76e3c1ddac08206980a295546bb2e100206081d827c338829135cc5c7d7f03ad9ba8ecffc6f5cddf63a2655c55922786230c000'
            const box1 = wasm.ErgoBox.sigma_parse_bytes(Uint8Array.from(Buffer.from(box1Hex, "hex")))
            const dataBox = wasm.ErgoBox.sigma_parse_bytes(Uint8Array.from(Buffer.from(dataBoxHex, "hex")))
            const obj = {
                boxes: [box1],
                dataBoxes: [dataBox],
                commitments: [undefined],
                createTime: 0,
                requiredSigner: 1
            }
            const handler = new MultiSigHandler(publicKeys, "5bc1d17d0612e696a9138ab8e85ca2a02d0171440ec128a9ad557c28bd5ea046")
            sinon.stub(handler, 'getQueuedTransaction').withArgs('txid').returns(Promise.resolve(obj));
            handler.handleSign('sender', {signed: ["1"], simulated: ["2"], tx: "", txId: "txid"})
        })
    })

    describe("handleCommitment", () => {
        it("checks that handleCommitment called with no erro", () => {
            const box1Hex = '80a8d6b907100304000e20a6ac381e6fa99929fd1477b3ba9499790a775e91d4c14c5aa86e9a118dfac8530400d801d601b2db6501fe730000ea02d1aedb63087201d901024d0e938c720201730198b2e4c672010510730200ade4c67201041ad901020ecdee72028cc10f00003a4f8dac9bbe80fffaf400edd5779b7ccd5628beceab06c41b5b7b3e091e963501'
            const dataBoxHex = '80ade2041006040004000400040004000402d804d601b2a5730000d602e4c6a7041ad603e4c6a70510d604ad7202d901040ecdee7204ea02d19683020193c27201c2a7938cb2db63087201730100018cb2db6308a773020001eb02ea02d19683020193e4c67201041a720293e4c672010510720398b2e4c6b2db6501fe7303000510730400720498b2720373050072048cc10f01a6ac381e6fa99929fd1477b3ba9499790a775e91d4c14c5aa86e9a118dfac85301021a0421028d938d67befbb8ab3513c44886c16c2bcd62ed4595b9b216b20ef03eb8fb8fb82103074e09c476bb215dc3aeff908d0b7691895a99dfc3bd950fa629defe541e0364210300e8750a242ee7d78f5b458e1f7474bd884d2b7894676412ba6b5f319d2ee41021023a5b48c87cd9fece23f5acd08cb464ceb9d76e3c1ddac08206980a295546bb2e100206081d827c338829135cc5c7d7f03ad9ba8ecffc6f5cddf63a2655c55922786230c000'
            const box1 = wasm.ErgoBox.sigma_parse_bytes(Uint8Array.from(Buffer.from(box1Hex, "hex")))
            const dataBox = wasm.ErgoBox.sigma_parse_bytes(Uint8Array.from(Buffer.from(dataBoxHex, "hex")))
            const obj = {
                boxes: [box1],
                dataBoxes: [dataBox],
                commitments: [undefined],
                createTime: 0,
                requiredSigner: 2
            }
            const handler = new MultiSigHandler(publicKeys, "5bc1d17d0612e696a9138ab8e85ca2a02d0171440ec128a9ad557c28bd5ea046")
            sinon.stub(handler, 'getQueuedTransaction').withArgs('txid').returns(Promise.resolve(obj));
            handler.handleCommitment('sender', {
                commitment: {index: [{a: "3", position: "1-1"}]},
                txId: "txid",
                index: 1
            })
        })
    })

    describe("cleanup", () => {
        /**
         * add two instance of transaction to multi-sig handler using getTransaction
         * then clean called.
         * one of them must removed from txQueue. so create time must differ
         */
        it("checks that cleanup remove element from txQueue", async () => {
            const handler = new MultiSigHandler(publicKeys, "5bc1d17d0612e696a9138ab8e85ca2a02d0171440ec128a9ad557c28bd5ea046")
            const tx1 = await handler.getQueuedTransaction("tx1")
            Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 3000);
            const tx2 = await handler.getQueuedTransaction("tx2")
            handler.cleanup()
            expect(await handler.getQueuedTransaction("tx2")).to.be.eql(tx2)
            expect(await handler.getQueuedTransaction("tx1")).to.not.be.eql(tx1)
        }).timeout(5000)
    })
})
