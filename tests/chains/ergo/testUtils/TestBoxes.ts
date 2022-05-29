import { EventTrigger, PaymentTransaction } from "../../../../src/models/Models";
import TestUtils from "../../../testUtils/TestUtils";
import { CoveringErgoBoxes, ErgoBlockHeader } from "../../../../src/chains/ergo/models/Interfaces";
import {
    BoxValue,
    ErgoBox, ErgoBoxes,
    I64, ReducedTransaction,
    Token,
    TokenAmount,
    TokenId,
    Tokens,
    TxId,
    UnsignedTransaction
} from "ergo-lib-wasm-nodejs";
import Utils from "../../../../src/chains/ergo/helpers/Utils";
import TestData from "./TestData";

class TestBoxes {

    static testBankAddress: string = "9hPoYNQwVDbtAyt5uhYyKttye7ZPzZ7ePcc6d2rgKr9fiZm6DhD"
    static testBlockchainHeight: number = 100000

    /**
     * returns BoxValue object for arbitrary amount of Erg
     */
    static ergToBoxValue = (erg: number): BoxValue => Utils.boxValueFromString((BigInt(erg) * BigInt(1000000000)).toString())

    /**
     * generates a mocked event trigger for Erg payment in ergo chain
     */
    static mockErgPaymentEventTrigger = (): EventTrigger => {
        return new EventTrigger("", "ergo", "",
            "9hCPp7N4foJ68kPEwMMEa8tCsXVTDoLvXbdkm8s5Ht7Dpnc3L2t",
            "50000000000", "1000000000", "1500000", "",
            "erg", TestUtils.generateRandomId(), "", []
        )
    }

    /**
     * generates a mocked event trigger for token payment in ergo chain
     */
    static mockTokenPaymentEventTrigger = (): EventTrigger => {
        return new EventTrigger("", "ergo", "",
            "9hCPp7N4foJ68kPEwMMEa8tCsXVTDoLvXbdkm8s5Ht7Dpnc3L2t",
            "80", "10", "5", "",
            "907a31bdadad63e44e5b3a132eb5be218e694270fae6fa55b197ecccac19f87e", TestUtils.generateRandomId(), "", []
        )
    }

    /**
     * generates 3 input boxes for ergo bank address
     */
    static mockBankBoxes = (): Promise<CoveringErgoBoxes> => {
        return new Promise<CoveringErgoBoxes>((resolve, reject) => {
            const targetTokenId: string = "907a31bdadad63e44e5b3a132eb5be218e694270fae6fa55b197ecccac19f87e"
            const randomTokenId: string = TestUtils.generateRandomId()

            const box1Tokens: Tokens = new Tokens()
            box1Tokens.add(new Token(TokenId.from_str(targetTokenId), TokenAmount.from_i64(I64.from_str("44"))))
            box1Tokens.add(new Token(TokenId.from_str(randomTokenId), TokenAmount.from_i64(I64.from_str("100"))))
            const box1: ErgoBox = new ErgoBox(
                this.ergToBoxValue(30),
                this.testBlockchainHeight + 5,
                Utils.addressStringToContract(this.testBankAddress),
                TxId.from_str(TestUtils.generateRandomId()),
                0,
                box1Tokens
            )
            const box2Tokens: Tokens = new Tokens()
            box2Tokens.add(new Token(TokenId.from_str(targetTokenId), TokenAmount.from_i64(I64.from_str("35"))))
            const box2: ErgoBox = new ErgoBox(
                this.ergToBoxValue(100),
                this.testBlockchainHeight,
                Utils.addressStringToContract(this.testBankAddress),
                TxId.from_str(TestUtils.generateRandomId()),
                0,
                box2Tokens
            )
            const box3: ErgoBox = new ErgoBox(
                this.ergToBoxValue(10),
                this.testBlockchainHeight + 20,
                Utils.addressStringToContract(this.testBankAddress),
                TxId.from_str(TestUtils.generateRandomId()),
                2,
                new Tokens()
            )
            resolve({
                covered: true,
                boxes: [box1, box2, box3]
            })
        })
    }

    /**
     * generates a mocked payment transaction that transfers a token
     * @param event token payment event trigger
     */
    static mockTokenTransferringPaymentTransaction = async (event: EventTrigger): Promise<PaymentTransaction> => {
        const targetAddressErgoTree: string = Utils.addressStringToErgoTreeString(event.toAddress)
        const bankAddressErgoTree: string = Utils.addressStringToErgoTreeString(this.testBankAddress)

        const inBoxes = ErgoBoxes.empty()
        const bankBoxes = await this.mockBankBoxes()
        bankBoxes.boxes.forEach(box => inBoxes.add(box))

        const txJsonString: string = TestData.tokenTransferringErgPaymentTransactionString(
            bankBoxes.boxes.map(box => box.box_id().to_str()),
            targetAddressErgoTree,
            bankAddressErgoTree
        )
        const tx = UnsignedTransaction.from_json(txJsonString)

        const reducedTx = ReducedTransaction.from_unsigned_tx(tx, inBoxes, ErgoBoxes.empty(), TestData.mockedErgoStateContext)

        const txBytes = reducedTx.sigma_serialize_bytes()
        const txId = tx.id().to_str()
        const eventId = event.sourceTxId
        return new PaymentTransaction(txId, eventId, txBytes)
    }

    /**
     * generates a mocked payment transaction that only transfers erg
     * @param event erg payment event trigger
     */
    static mockErgTransferringPaymentTransaction = async (event: EventTrigger): Promise<PaymentTransaction> => {
        const targetAddressErgoTree: string = Utils.addressStringToErgoTreeString(event.toAddress)
        const bankAddressErgoTree: string = Utils.addressStringToErgoTreeString(this.testBankAddress)

        const inBoxes = ErgoBoxes.empty()
        const bankBoxes = await this.mockBankBoxes()
        bankBoxes.boxes.forEach(box => inBoxes.add(box))

        const txJsonString: string = TestData.ergOnlyTokenPaymentTransactionString(
            bankBoxes.boxes.map(box => box.box_id().to_str()),
            targetAddressErgoTree,
            bankAddressErgoTree
        )
        const tx = UnsignedTransaction.from_json(txJsonString)

        const reducedTx = ReducedTransaction.from_unsigned_tx(tx, inBoxes, ErgoBoxes.empty(), TestData.mockedErgoStateContext)

        const txBytes = reducedTx.sigma_serialize_bytes()
        const txId = tx.id().to_str()
        const eventId = event.sourceTxId
        return new PaymentTransaction(txId, eventId, txBytes)
    }

    /**
     * generates a mocked payment transaction that transfers two tokens
     * @param event token payment event trigger
     */
    static mockMultipleTokensTransferringPaymentTransaction = async (event: EventTrigger): Promise<PaymentTransaction> => {
        const targetAddressErgoTree: string = Utils.addressStringToErgoTreeString(event.toAddress)
        const bankAddressErgoTree: string = Utils.addressStringToErgoTreeString(this.testBankAddress)

        const inBoxes = ErgoBoxes.empty()
        const bankBoxes = await this.mockBankBoxes()
        bankBoxes.boxes.forEach(box => inBoxes.add(box))

        const txJsonString: string = TestData.multipleTokenTransferringTokenPaymentTransactionString(
            bankBoxes.boxes.map(box => box.box_id().to_str()),
            targetAddressErgoTree,
            bankAddressErgoTree
        )
        const tx = UnsignedTransaction.from_json(txJsonString)

        const reducedTx = ReducedTransaction.from_unsigned_tx(tx, inBoxes, ErgoBoxes.empty(), TestData.mockedErgoStateContext)

        const txBytes = reducedTx.sigma_serialize_bytes()
        const txId = tx.id().to_str()
        const eventId = event.sourceTxId
        return new PaymentTransaction(txId, eventId, txBytes)
    }

    /**
     * generates a mocked payment transaction that transfers wrong token
     * @param event token payment event trigger
     */
    static mockWrongTokenTransferringPaymentTransaction = async (event: EventTrigger): Promise<PaymentTransaction> => {
        const targetAddressErgoTree: string = Utils.addressStringToErgoTreeString(event.toAddress)
        const bankAddressErgoTree: string = Utils.addressStringToErgoTreeString(this.testBankAddress)

        const inBoxes = ErgoBoxes.empty()
        const bankBoxes = await this.mockBankBoxes()
        bankBoxes.boxes.forEach(box => inBoxes.add(box))

        const txJsonString: string = TestData.wrongTokenTransferringTokenPaymentTransactionString(
            bankBoxes.boxes.map(box => box.box_id().to_str()),
            targetAddressErgoTree,
            bankAddressErgoTree
        )
        const tx = UnsignedTransaction.from_json(txJsonString)

        const reducedTx = ReducedTransaction.from_unsigned_tx(tx, inBoxes, ErgoBoxes.empty(), TestData.mockedErgoStateContext)

        const txBytes = reducedTx.sigma_serialize_bytes()
        const txId = tx.id().to_str()
        const eventId = event.sourceTxId
        return new PaymentTransaction(txId, eventId, txBytes)
    }

    /**
     * generates 14 input boxes for ergo bank address
     */
    static mockManyBankBoxes = (): Promise<CoveringErgoBoxes> => {
        return new Promise<CoveringErgoBoxes>((resolve, reject) => {
            const targetTokenId: string = "907a31bdadad63e44e5b3a132eb5be218e694270fae6fa55b197ecccac19f87e"
            const secondTokenId: string = "068354ba0c3990e387a815278743577d8b2d098cad21c95dc795e3ae721cf906"
            const randomTokenId: string = TestUtils.generateRandomId()

            const box1Tokens: Tokens = new Tokens()
            box1Tokens.add(new Token(TokenId.from_str(targetTokenId), TokenAmount.from_i64(I64.from_str("44"))))
            box1Tokens.add(new Token(TokenId.from_str(secondTokenId), TokenAmount.from_i64(I64.from_str("100"))))
            const box1: ErgoBox = new ErgoBox(
                this.ergToBoxValue(30),
                this.testBlockchainHeight + 5,
                Utils.addressStringToContract(this.testBankAddress),
                TxId.from_str(TestUtils.generateRandomId()),
                0,
                box1Tokens
            )
            const box2Tokens: Tokens = new Tokens()
            box2Tokens.add(new Token(TokenId.from_str(targetTokenId), TokenAmount.from_i64(I64.from_str("35"))))
            box2Tokens.add(new Token(TokenId.from_str(randomTokenId), TokenAmount.from_i64(I64.from_str("100"))))
            const box2: ErgoBox = new ErgoBox(
                this.ergToBoxValue(100),
                this.testBlockchainHeight,
                Utils.addressStringToContract(this.testBankAddress),
                TxId.from_str(TestUtils.generateRandomId()),
                0,
                box2Tokens
            )
            const box3Tokens: Tokens = new Tokens()
            box3Tokens.add(new Token(TokenId.from_str(secondTokenId), TokenAmount.from_i64(I64.from_str("123456789123456789"))))
            const box3: ErgoBox = new ErgoBox(
                this.ergToBoxValue(10),
                this.testBlockchainHeight + 20,
                Utils.addressStringToContract(this.testBankAddress),
                TxId.from_str(TestUtils.generateRandomId()),
                2,
                new Tokens()
            )
            const middleBoxesArray: ErgoBox[] = Array.apply(null, Array(10)).map((_: ErgoBlockHeader) => {
                return new ErgoBox(
                    this.ergToBoxValue(10),
                    this.testBlockchainHeight + 20,
                    Utils.addressStringToContract(this.testBankAddress),
                    TxId.from_str(TestUtils.generateRandomId()),
                    2,
                    new Tokens()
                )
            })
            // same as box2
            const box14: ErgoBox = new ErgoBox(
                this.ergToBoxValue(1),
                this.testBlockchainHeight,
                Utils.addressStringToContract(this.testBankAddress),
                TxId.from_str(TestUtils.generateRandomId()),
                0,
                box2Tokens
            )
            resolve({
                covered: true,
                boxes: [box1, box2, box3].concat(middleBoxesArray).concat([box14])
            })
        })
    }

}

export default TestBoxes
