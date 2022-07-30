import { MultiSigHandler } from "../../../src/guard/multisig/MultiSig";
import { expect } from "chai";
import {
    sendMessagePayloadArguments,
    verifySendMessageCalledOnce,
    verifySendMessageWithReceiverCalledOnce
} from "../../communication/mocked/MockedDialer";
import { anything, deepEqual, instance, mock, verify } from "ts-mockito";

const publicKeys = [
    '028d938d67befbb8ab3513c44886c16c2bcd62ed4595b9b216b20ef03eb8fb8fb8',
    '03074e09c476bb215dc3aeff908d0b7691895a99dfc3bd950fa629defe541e0364',
    '0300e8750a242ee7d78f5b458e1f7474bd884d2b7894676412ba6b5f319d2ee410',
    '023a5b48c87cd9fece23f5acd08cb464ceb9d76e3c1ddac08206980a295546bb2e',
]

const secrets = [
    '5bc1d17d0612e696a9138ab8e85ca2a02d0171440ec128a9ad557c28bd5ea046',
    '168e8fee8ac6965832d6c1c17cdf60c1b582b09f293d8bd88231e32740e3b24f',
    '03a9aab8fa8199b738ba25dfa01be563f291e6a2c2bffbf975627bd82f11dcbf',
    'c6f3da0c57da4e2af823c64b8ca052359ed2abe606841e3939b399bc4c94c7af',
]
const handler = new MultiSigHandler(publicKeys, "5bc1d17d0612e696a9138ab8e85ca2a02d0171440ec128a9ad557c28bd5ea046")

describe("MultiSigHandler", () => {
    describe("sendMessage", () => {
        it("", () => {
            sendMessagePayloadArguments(['index', 'id', 'nonce', 'myId'])
            handler.sendMessage({
                type: "approve",
                sign: "",
                payload: {
                    nonce: "nonce",
                    myId: "peerId",
                    nonceToSign: "nonceToSign"
                }
            })
        })
    })

    // describe("sendRegister",()=>{
    //     verifySendMessageCalledOnce('multi-sig',)
    //     handler.sendRegister();
    //
    // })

    describe("getIndex", () => {
        it("checks index should be 0", () => {
            expect(handler.getIndex()).to.be.equal(0);
        })
    })

    describe("getProver", () => {
        it("should return prover", () => {
            const wallet = handler.getProver();
        })
    })

    describe("handleRegister", () => {
        it("", () => {
            handler.handleRegister('sender', {nonce: 'nonce', myId: "myId"})
        })
    })

    describe("handleApprove", () => {
        it("", () => {
            handler.handleApprove('sender', {nonce: 'nonce', myId: "myId"})
        })
    })

    describe("handleMessage", () => {
        it("", () => {
            const Handler=mock(MultiSigHandler);
            const handler = new MultiSigHandler(publicKeys, "5bc1d17d0612e696a9138ab8e85ca2a02d0171440ec128a9ad557c28bd5ea046")

            verify(Handler.handleApprove(anything(),anything())).once()
            const message='{"type":"approve","sign":"hgtz8vhzFbi53BJmTRMGO9jHnRU7eS6m/LDA8M/eyTt9gwYDOa0Rtfpvrg+cF1XnDi+pQ3cB0ID3f8Vd0crvZA==","payload":{"nonce":"UolXp9d39z017FoKUzs7Y398zkkJi0rRxjQ4G+8DrmE=","nonceToSign":"0zWfBa0Vp7F782cwDpBqkCY27QHUQnKhwg6bdxk2VdE=","myId":"12D3KooWHKkqnopKUnZ2BhzLiWJDwi1u8sx9i7gn4sFEzP7J8MRg","index":2,"id":"12D3KooWHKkqnopKUnZ2BhzLiWJDwi1u8sx9i7gn4sFEzP7J8MRg"}}'
            handler.handleMessage(message, 'multi-sig',"12D3KooWHKkqnopKUnZ2BhzLiWJDwi1u8sx9i7gn4sFEzP7J8MRg");
        })
    })

    describe("getPeerId", () => {
        it("checks peerId should be peerId", () => {
            expect(handler.getPeerId()).to.be.eql("peerId");
        })
    })

})


