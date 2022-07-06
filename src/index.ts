import "reflect-metadata";
import express, { Router } from "express";
import { p2pRouter } from "./api/p2p";
import { initDataSources } from "./helpers/dataSources";
import Configs from "./helpers/Configs";

// initialize all data sources
await initDataSources()

// run express app
const app = express();
const port = Configs.expressPort;

// add express api routers
app.use(express.json({ limit: Configs.expressBodyLimit }))
const router = Router();
router.use('/p2p', p2pRouter)

app.use(router)
app.listen(port, () => {
    console.log(`server started at http://localhost:${port}`);
});
