import { expect } from "chai";
import {
    mockExistsSync,
    mockReadFileSync,
    resetMockedFS
} from "./mocked/MockedDialer";
import Dialer from "../../src/communication/Dialer";
import { createFromJSON } from "@libp2p/peer-id-factory";

describe("Dialer", () => {

    beforeEach("reset exist PeerIdFile mock", () => {
        resetMockedFS()
    })

    /**
     * Target: testing getOrCreatePeerID
     * Dependencies:
     *    Dialer
     * Expected Output:
     *    The function should return peerID (peerIdFile exist)
     */
    it("should call return PeerId when peerIdFile exist", async () => {
        // mock existsSync of fs in getOrCreatePeerID of Dialer
        mockExistsSync(true)
        const peerIdJson = {
            "id":"12D3KooWSvLyXh1cQmrfv4gNWVsYf88BqYwRssSWz4DortjD3m7T",
            "privKey":"CAESQDh4In8aegExZPaCv9Bon365FlTdeDQyhfXTh3g9mq/Q/h7QMrAgFwe9m/eUzL9W5DMD+aWEArcDOEDaVqvJzDY=",
            "pubKey":"CAESIP4e0DKwIBcHvZv3lMy/VuQzA/mlhAK3AzhA2larycw2"
        }
        mockReadFileSync(peerIdJson)
        const result = await Dialer.getOrCreatePeerID()
        expect(result).to.deep.equal({peerId: await createFromJSON(peerIdJson), exist: true})
    })

    /**
     * Target: testing getOrCreatePeerID and savePeerIdIfNeed
     * Dependencies:
     *    Dialer
     * Expected Output:
     *    The function should return peerID (peerIdFile don't exist) and called fs.writeFile() file
     *
     * TODO: There is a problem in ts-mockito for mock or verify single method such as `createEd25519PeerId` and verifying called fs.writeFile() need to rewrite this test with other packages
     *  https://git.ergopool.io/ergo/rosen-bridge/ts-guard-service/-/issues/21
     */
    // it("should call return PeerId when peerIdFile don't exist", async () => {
    //     // mock existsSync of fs in getOrCreatePeerID of Dialer
    //     mockExistsSync(false)
    //     const peerIdJson = {
    //         "id":"12D3KooWSvLyXh1cQmrfv4gNWVsYf88BqYwRssSWz4DortjD3m7T",
    //         "privKey":"CAESQDh4In8aegExZPaCv9Bon365FlTdeDQyhfXTh3g9mq/Q/h7QMrAgFwe9m/eUzL9W5DMD+aWEArcDOEDaVqvJzDY=",
    //         "pubKey":"CAESIP4e0DKwIBcHvZv3lMy/VuQzA/mlhAK3AzhA2larycw2"
    //     }
    //     // mockWriteFileSync(await createFromJSON(peerIdJson))
    //     await Dialer.savePeerIdIfNeed({ peerId: await createFromJSON(peerIdJson), exist: false
    //     })
    //     // verifyWriteFileSync(JSON.stringify(peerIdJson))
    //
    // })

})
