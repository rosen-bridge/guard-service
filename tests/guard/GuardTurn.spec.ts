import { reset, spy, when } from "ts-mockito";
import Utils from "../../src/helpers/Utils";
import { expect } from "chai";
import { resetGuardTurn } from "../testUtils/MockedUtils";

describe("guard turn methods", () => {
    const currentTimeStamp = 1658005364767

    beforeEach("reset isEventConfirmedEnough mock", () => {
        resetGuardTurn()
    })

    it("secondsToNextTurn should return seconds to guard next turn successfully", () => {
        // mock Date
        const date = spy(Date)
        when(date.now()).thenReturn(currentTimeStamp)

        // run test
        const result = Utils.secondsToNextTurn()
        expect(result).to.equal(654)

        // reset mocked Date object
        reset(date)
    })

    it("guardTurn should return guard turn successfully", () => {
        // mock Date
        const date = spy(Date)
        when(date.now()).thenReturn(currentTimeStamp)

        // run test
        const result = Utils.guardTurn()
        expect(result).to.equal(4)

        // reset mocked Date object
        reset(date)
    })

    it("secondsToReset should return seconds to end of current guard turn successfully", () => {
        // mock Date
        const date = spy(Date)
        when(date.now()).thenReturn(currentTimeStamp)

        // run test
        const result = Utils.guardTurn()
        expect(result).to.equal(4)

        // reset mocked Date object
        reset(date)
    })

})
