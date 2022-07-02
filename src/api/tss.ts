import {Request, Response, Router} from "express";
import assert from "assert";
import CardanoChain from "../chains/cardano/CardanoChain";

export const tssRouter = Router();

/**
 * Api for receive signedTx from tss service
 * @bodyParam {string}
 * @bodyParam {object}
 * @bodyParam {string}
 */
tssRouter.post("/tssSign", async (req: Request, res: Response) => {
    let signedTxHash = ""
    let txHash = ""
    try {
        assert(req.body.signature, "key signature is required!")
        assert(req.body.m, "key m is required!")

        signedTxHash = req.body.signature
        txHash = req.body.m
    }
    catch (error) {
        res.status(400).send({message: error.message})
    }

    const cardanoChain = new CardanoChain()
    cardanoChain.signTransaction(txHash, signedTxHash).then(signedTx => {
        if (signedTx !== null) cardanoChain.submitTransaction(signedTx)
    })
    res.send({message: "ok"})
});
