import { spy, when } from "ts-mockito";
import ExplorerApi from "../../src/chains/ergo/network/ExplorerApi";
import { rosenConfig } from "../../src/helpers/RosenConfig";
import { GuardConfig } from "../../src/helpers/GuardConfig";
import { expect } from "chai";
import { guardBox, guardPks } from "./testData";

describe("GuardConfig tests", () => {

    describe('setConfig',  () => {

        /**
         * Target: testing setConfig
         * Dependencies:
         *    ExplorerAPI
         * Scenario:
         *    mock explorer api
         *    Run test
         *    Expect to have updated config from the box
         * Expected Output:
         *    The function should update and set the correct config from guard box
         */
        it('should return the correct config', async () => {
            const spiedExplorer = spy(ExplorerApi)
            when(spiedExplorer.getBoxesByTokenId(rosenConfig.guardNFT)).thenResolve(guardBox)

            const testGuardConfig = new GuardConfig()
            await testGuardConfig.setConfig()
            expect(testGuardConfig.guardsLen).eql(7)
            expect(testGuardConfig.publicKeys).has.length(7)
            expect(testGuardConfig.guardId).eql(1)
            expect(testGuardConfig.publicKeys).eql(guardPks)
            expect(testGuardConfig.requiredSign).eql(5)
        });
    });
})
