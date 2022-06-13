import {SubscribeChannel} from "../../../src/communication/CallbackUtils";

class TestFuncs {
    static testCallBackFunc = function (msg: any, channel: string, sender: string): void {
        console.log(`msg is: ${msg}`, `channel is: ${channel}`, `sender is: ${sender}`)
    } as SubscribeChannel
}

export default TestFuncs
