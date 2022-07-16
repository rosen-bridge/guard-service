import { mockExplorerGetTxConfirmationCalledOnce } from "../chains/ergo/mocked/MockedExplorer";
import { expect } from "chai";
import { EventTrigger } from "../../src/models/Models";
import TestUtils from "../testUtils/TestUtils";
import EventProcessor from "../../src/guard/EventProcessor";
import { mockKoiosGetTxConfirmationCalledOnce } from "../chains/cardano/mocked/MockedKoios";

describe("EventProcessor", () => {

    describe("isEventConfirmedEnough", () => {

        /**
         * Target: testing isEventConfirmedEnough
         * Dependencies:
         *    ExplorerApi
         * Expected Output:
         *    The function should return true
         */
        it("should return true when event confirmed enough in ergo", async () => {
            const txId = TestUtils.generateRandomId()
            const fromErgoEventTrigger = new EventTrigger("ergo", "", "",
                "", "", "", "", "",
                "", txId, "", []
            )
            mockExplorerGetTxConfirmationCalledOnce(txId, 30)

            // run test
            const result = await EventProcessor.isEventConfirmedEnough(fromErgoEventTrigger)
            expect(result).to.be.true
        })

        /**
         * Target: testing isEventConfirmedEnough
         * Dependencies:
         *    KoiosApi
         * Expected Output:
         *    The function should return true
         */
        it("should return true when event confirmed enough in cardano", async () => {
            const txId = TestUtils.generateRandomId()
            const fromCardanoEventTrigger = new EventTrigger("cardano", "", "",
                "", "", "", "", "",
                "", txId, "", []
            )
            mockKoiosGetTxConfirmationCalledOnce(txId, 30)

            // run test
            const result = await EventProcessor.isEventConfirmedEnough(fromCardanoEventTrigger)
            expect(result).to.be.true
        })

    })

})