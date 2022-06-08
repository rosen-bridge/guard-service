import express, {Router} from "express";
import {p2pRouter} from "./api/p2p";
import {paymentRouter} from "./api/payment";

const app = express();
const port = 8080;

app.use(express.json())
const router = Router();

router.use('/payment', paymentRouter)
router.use('/p2p', p2pRouter)

app.use(router)
app.listen(port, () => {
    console.log(`server started at http://localhost:${port}`);
});
