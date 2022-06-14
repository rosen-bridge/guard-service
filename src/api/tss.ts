import {Request, Response, Router} from "express";
import assert from "assert";

export const tssRouter = Router();

/**
 * Api for receive signedTx from tss service
 * @bodyParam {string}
 * @bodyParam {object}
 * @bodyParam {string}
 */
tssRouter.post("/tssSign", async (req: Request, res: Response) => {
    try {
        assert(req.body.signature, "key signature is required!")
        assert(req.body.m, "key m is required!")

        const signedTxHash: string = req.body.signature
        const txHash: string = req.body.m

        // TODO:
        //  1. get txBytes from db using txHash
        //  2. convert txBytes to Transaction object
        //  3. call async signTransaction(tx, signedTxHash)

        res.send({message: "ok"})
    }
    catch (error) {
        res.status(400).send({message: error.message})
    }
});
