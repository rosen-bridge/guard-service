import express, { Router } from "express";
import Configs from "../helpers/Configs";
import { p2pRouter } from "../api/p2p";
import Dialer from "../communication/Dialer";
import { tssRouter } from "../api/tss";
import { logger } from "../log/Logger";

const initExpress = async () => {
    // start the dialer
    await Dialer.getInstance()

    // run express app
    const app = express();
    const port = Configs.expressPort;

    // add express api routers
    app.use(express.json({ limit: Configs.expressBodyLimit }))
    const router = Router();
    router.use('/p2p', p2pRouter)
    router.use('/tss', tssRouter)

    app.use(router)
    app.listen(port, () => {
        logger.info('guard service started at', {at: `http://localhost:${port}`})
    });
}

export { initExpress }
