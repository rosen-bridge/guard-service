import {anyOfClass, anything, reset, spy, when, mock, instance, verify} from "ts-mockito";
import RewardBoxes from "../../../src/chains/ergo/helpers/RewardBoxes";
// import { EventTrigger } from "../../../../src/models/Models";
import { ErgoBox } from "ergo-lib-wasm-nodejs";
import Dialer from "../../../src/communication/Dialer"
import {apiCallBack} from "../../../src/communication/CallbackUtils";
import TestFuncs from "../testUtils/TestBoxes";
import {expect} from "chai";
import pkg from '@jest/globals';

// let mockedDialer = spy(Dialer)
class Dialerr {

}

/**
 * mocks RewardBoxes getEventBox method to return returnBox when called for an event
 * @param dialer
 */
const mockSubscribedChannels = async (): Promise<void> => {
    pkg.jest.spyOn(Dialer.prototype as any, "startDialer")
    // let mockedDialer: Dialer = mock(Dialer)
    // let dialer: Dialer = instance(mockedDialer);
    // dialer.subscribeChannel("test", TestFuncs.testCallBackFunc)
    // expect(mockedDialer.getSubscribedChannels()).to.be.equal({
    //     test: {
    //         func: TestFuncs.testCallBackFunc,
    //     }
    // })
    // verify(mockedDialer.)
    // spy(mockedDialer.instance)
    // spy(mockedDialer.getInstance()).
    // verify(mockedDialer.)
    // when((mockedDialer.getInstance()))(anything()).then()
    // when((mockedDialer.getInstance())).thenResolve(anyOfClass(Dialerr))
    // when((await mockedDialer.getInstance()).subscribeChannel("sd", TestFuncs.testCallBackFunc, "dasdsa"))
    // mockedDialer.subscribeChannel("test", apiCallBack, "https://localhost:8080/test")
}

// /**
//  * mocks RewardBoxes getEventValidCommitments method to return returnBoxes when called for an event
//  * @param event
//  * @param returnBoxes
//  */
// const mockGetEventValidCommitments = (event: EventTrigger, returnBoxes: ErgoBox[]): void => {
//     when(mockedRewardBoxes.getEventValidCommitments(event)).thenReturn(returnBoxes)
// }
//
// /**
//  * resets mocked methods of RewardBoxes
//  */
// const resetMockedRewardBoxes = (): void => {
//     reset(mockedDialer)
//     mockedDialer = spy(Dialer)
// }

export { mockSubscribedChannels }
