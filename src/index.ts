import express from "express";
import { Request, Response } from 'express';
import { PaymentTransaction, EventTrigger } from "./models/Models";
import { EventTriggerModel, PaymentTransactionJsonModel } from "./models/Interfaces";
import EventProcessor from "./guard/EventProcessor";

const eventProcessor = new EventProcessor()

const app = express();
const port = 8080;

app.use(express.json())

/**
 * Api for generating payment transaction for an event
 */
app.post("/generate/", async (req: Request, res: Response) => {
    const eventJson: EventTriggerModel = req.body
    const event = new EventTrigger(
        eventJson.fromChain,
        eventJson.toChain,
        eventJson.fromAddress,
        eventJson.toAddress,
        eventJson.amount,
        eventJson.bridgeFee,
        eventJson.networkFee,
        eventJson.sourceChainTokenId,
        eventJson.targetChainTokenId,
        eventJson.sourceTxId,
        eventJson.sourceBlockId,
        eventJson.WIDs
    )
    const paymentTx = await eventProcessor.createEventPayment(event)

    res.send({
        txId: paymentTx.txId,
        eventId: paymentTx.eventId,
        txBytes: paymentTx.getTxHexString()
    })
});

/**
 * Api for verifying payment transaction with an event
 */
app.post("/verify/", async (req: Request, res: Response) => {
    const eventJson: EventTriggerModel = req.body.event
    const paymentTxJson: PaymentTransactionJsonModel = req.body.paymentTx
    const event = new EventTrigger(
        eventJson.fromChain,
        eventJson.toChain,
        eventJson.fromAddress,
        eventJson.toAddress,
        eventJson.amount,
        eventJson.bridgeFee,
        eventJson.networkFee,
        eventJson.sourceChainTokenId,
        eventJson.targetChainTokenId,
        eventJson.sourceTxId,
        eventJson.sourceBlockId,
        eventJson.WIDs
    )
    const paymentTx = new PaymentTransaction(
        paymentTxJson.txId,
        paymentTxJson.eventId,
        Buffer.from(paymentTxJson.txBytes, "hex")
    )

    const isValid = eventProcessor.verifyPaymentTransactionWithEvent(paymentTx, event)

    res.send({
        txId: paymentTx.txId,
        eventId: paymentTx.eventId,
        txBytes: paymentTx.getTxHexString(),
        isValid: isValid
    })
});

app.listen(port, () => {
    console.log(`server started at http://localhost:${port}`);
});
