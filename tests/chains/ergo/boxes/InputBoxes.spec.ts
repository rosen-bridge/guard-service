import { beforeEach } from "mocha";
import { resetMockedInputBoxes } from "../mocked/MockedInputBoxes";
import TestBoxes from "../testUtils/TestBoxes";
import { clearTables, insertCommitmentBoxRecord, insertEventRecord } from "../../../db/mocked/MockedScannerModel";
import Utils from "../../../../src/helpers/Utils";
import InputBoxes from "../../../../src/chains/ergo/boxes/InputBoxes";
import { expect } from "chai";

describe("InputBoxes", () => {
    const mockedEvent = TestBoxes.mockErgPaymentEventTrigger()
    const boxes = TestBoxes.mockEventBoxWithSomeCommitments()
    const eventBox = boxes[0]
    const commitmentBoxes = boxes.slice(1)

    describe("getEventBox", () => {

        beforeEach("clear db tables", async () => {
            await clearTables()
            resetMockedInputBoxes()
        })

        /**
         * Target: testing getEventBox
         * Dependencies:
         *    dbAction
         * Scenario:
         *    Insert mocked event box into db
         *    Run test
         *    Expect to receive a box with same id as mocked event box
         * Expected Output:
         *    The function should return the box
         */
        it("should return ErgoBox object successfully", async () => {
            await insertEventRecord(mockedEvent, "", Utils.Uint8ArrayToBase64String(eventBox.sigma_serialize_bytes()), 200)

            // run test
            const result = await InputBoxes.getEventBox(mockedEvent)
            expect(result.box_id().to_str()).to.equal(eventBox.box_id().to_str())
        })

    })

    describe("getEventValidCommitments", () => {

        beforeEach("clear db tables", async () => {
            await clearTables()
            resetMockedInputBoxes()
        })

        /**
         * Target: testing getEventValidCommitments
         * Dependencies:
         *    dbAction
         * Scenario:
         *    Insert mocked commitment boxes into db
         *    Run test
         *    Expect to receive commitment boxes which created before requested height
         * Expected Output:
         *    The function should return right boxes
         */
        it("should return ErgoBox objects of valid commitments successfully", async () => {
            await insertEventRecord(mockedEvent, "", Utils.Uint8ArrayToBase64String(eventBox.sigma_serialize_bytes()), 200)
            await insertCommitmentBoxRecord(mockedEvent.getId(), Utils.Uint8ArrayToBase64String(commitmentBoxes[0].sigma_serialize_bytes()), 201)
            await insertCommitmentBoxRecord(mockedEvent.getId(), Utils.Uint8ArrayToBase64String(commitmentBoxes[1].sigma_serialize_bytes()), 199)

            // run test
            const result = await InputBoxes.getEventValidCommitments(mockedEvent)
            expect(result.length).to.equal(1)
            expect(result[0].box_id().to_str()).to.equal(commitmentBoxes[1].box_id().to_str())
        })

    })

})
