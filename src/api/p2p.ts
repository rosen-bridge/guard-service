import {Request, Response, Router} from "express";
import {apiCallBack} from "../communication/CallbackUtils";
import Dialer from "../communication/Dialer";
import assert, {AssertionError} from "assert";

export const p2pRouter = Router();
const dialer = await Dialer.getInstance()


/**
 * Api for send a message over p2p protocol
 * @bodyParam {string}
 * @bodyParam {object}
 * @bodyParam {string}
 */
p2pRouter.post("/send", async (req: Request, res: Response) => {
    try {
        assert(req.body.channel, "key channel is required!")
        assert(req.body.message, "key message is required!")
        req.body.receiver ?
            dialer.sendMessage(req.body.channel, req.body.message, req.body.receiver):
            dialer.sendMessage(req.body.channel, req.body.message)

        res.send({message: "ok"})
    }
    catch (error) {
        res.status(error instanceof AssertionError ? 400 : 500).send({message: error.message})
    }
});

/**
 * Api for send a message over p2p protocol
 */
p2pRouter.post("/channel/subscribe", async (req: Request, res: Response) => {
    try {
        assert(req.body.channel, "key channel is required!")
        assert(req.body.url, "key url is required!")
        dialer.subscribeChannel(req.body.channel, apiCallBack, req.body.url)
        res.send({message: "ok"})
    }
    catch (error) {
        res.status(error instanceof AssertionError ? 400 : 500).send({message: error.message})
    }
});
