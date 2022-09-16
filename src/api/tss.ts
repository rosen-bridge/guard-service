import {Request, Response, Router} from "express";
import CardanoChain from "../chains/cardano/CardanoChain";
import { body, validationResult } from "express-validator";
import { logger } from "../log/Logger";

export const tssRouter = Router();

/**
 * Api for receive signedTx from tss service
 * @bodyParam {string}
 * @bodyParam {object}
 * @bodyParam {string}
 */
tssRouter.post("/sign",
    body("message")
        .notEmpty().withMessage("key message is required!"),
    body("status")
        .notEmpty().withMessage("key status is required!")
        .isString(),
    async (req: Request, res: Response) => {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                logger.warn('Received bad request from TSS Cardano tx sign callback', {error: JSON.stringify(errors.array())})
                return res.status(400).json({ message: JSON.stringify(errors.array()) });
            }
            const message = JSON.stringify(req.body.message)
            const status = req.body.status
            const cardanoChain = new CardanoChain()
            cardanoChain.signTransaction(message, status).then(() => res.send({message: "ok"}))
        }
        catch (error) {
            logger.error('An error occurred while processing TSS Cardano tx sign callback', {error: error.message})
            res.status(500).send({message: error.message})
        }
    }
);
