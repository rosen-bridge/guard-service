import axios from "axios";
import { JsonBI } from "../network/NetworkModels";
import CommunicationConfig from "./CommunicationConfig";
import { SubscribeChannel } from "./Interfaces";

const apiCallBack = function (msg: any, channel: string, sender: string, url: string): void {
    const data = axios.post(
        url,
        {
            "message": msg,
            "channel": channel,
            "sender": sender
        },
        {
            timeout: CommunicationConfig.apiCallbackTimeout,
            headers: {
                'Content-Type': 'application/json',
                Accept: 'application/json',
            }
        }
    );
    data.then(
        res => console.log("api callback response ", JsonBI.stringify(res.data, null, 4))
    ).catch(error => {
        if (axios.isAxiosError(error)) {
            console.warn('error message: ', error.message);
        } else {
            console.error('unexpected error: ', error);
        }
    });
} as SubscribeChannel

export { apiCallBack }
