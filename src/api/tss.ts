import {Request, Response, Router} from "express";
import CardanoChain from "../chains/cardano/CardanoChain";
import { body, validationResult } from "express-validator";

export const tssRouter = Router();

/**
 * Api for receive signedTx from tss service
 * @bodyParam {string}
 * @bodyParam {object}
 * @bodyParam {string}
 */
tssRouter.post("/tssSign",
    body("signature")
        .notEmpty().withMessage("key signature is required!")
        .isString(),
    body("m")
        .notEmpty().withMessage("key m is required!")
        .isString(),
    async (req: Request, res: Response) => {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                console.warn(`Received bad request from TSS Cardano tx sign callback. Errors ${JSON.stringify(errors.array())}`)
                return res.status(400).json({ message: JSON.stringify(errors.array()) });
            }
            const signedTxHash = req.body.signature
            const txHash = req.body.m
            const cardanoChain = new CardanoChain()
            cardanoChain.signTransaction(txHash, signedTxHash).then(signedTx => {
                if (signedTx !== null) cardanoChain.submitTransaction(signedTx)
            })
            res.send({message: "ok"})
        }
        catch (error) {
            console.log(`An error occurred while processing TSS Cardano tx sign callback: ${error.message}`)
            res.status(400).send({message: error.message})
        }
    }
);
