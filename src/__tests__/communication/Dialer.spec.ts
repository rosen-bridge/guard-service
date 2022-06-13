// import { expect } from "chai";
// import {anything, instance, mock, when} from "ts-mockito";
import Dialer from "../../communication/Dialer"
import TestFuncs from "./testUtils/TestBoxes";
// import {mockGetBoxesForErgoTree, resetMockedExplorerApi} from "../chains/ergo/mocked/MockedExplorer";

// import {mock} from "jest-mock";
// import {mockSubscribedChannels} from "./mocked/MockedRewardBoxes";
// import pkg from "@jest/globals";

describe("Dialer", () => {
    // const testBankAddress = "9hPoYNQwVDbtAyt5uhYyKttye7ZPzZ7ePcc6d2rgKr9fiZm6DhD" // TODO: use test config
    // const testBankErgoTree: string = Utils.addressStringToErgoTreeString(testBankAddress)

    describe("subscribeChannel", () => {
        // mock getting boxes
        // let dialerObj: Dialer = undefined
        //
        // pkg.jest.spyOn(Dialer.prototype as any, "startDialer")

        // beforeEach("mock ExplorerApi", function () {
        //     resetMockedExplorerApi()
        //     mockGetBoxesForErgoTree(testBankErgoTree, bankBoxes)
        // })

        /**
         * Target: testing generateTransaction
         * Dependencies:
         *    ExplorerApi
         *    RewardBoxes
         * Expected Output:
         *    The function should construct a valid tx successfully
         *    It should also verify it successfully
         */
        it("should add channel to list of subscribed channels", async () => {
            // const xx = jest.mocked(Dialer).prototype

            // const mockStartDialer = await jest.fn();
            // jest.mock('../../src/communication/Dialer', () => {
            //     return jest.fn().mockImplementation(() => {
            //         return {startDialer: mockStartDialer};
            //         // Now we can track calls to playSoundFile
            //     });
            // }, {virtual: true});

            // jest.mock('../../src/communication/Dialer', )
            const x = jest.spyOn(Dialer as any, "startDialer")

            // jest.fn(Dialer.prototype as any)
            // const dialer: Dialer = await Dialer.getInstance();
            // let mockedDialer: Dialer = mock((await Dialer.getInstance()))
            // when(mockedDialer.)
            // let dialer: Dialer = await Dialer.getInstance();
            // await dialer.subscribeChannel("test", TestFuncs.testCallBackFunc)
            // await console.log("heee ", dialer.getSubscribedChannels())
            // expect(dialer.getSubscribedChannels()).toBe(["test"])
            expect(x).toHaveBeenCalled();
        })

    })

})
