import { EventTrigger, PaymentTransaction } from "../../../../src/models/Models";
import TestUtils from "../../../testUtils/TestUtils";
import { Asset, Box, Boxes, CoveringErgoBoxes } from "../../../../src/chains/ergo/models/Interfaces";
import {
    BoxValue, Contract,
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
import { JsonBI } from "../../../../src/network/NetworkModels";
import TestConfigs from "../../../testUtils/TestConfigs";
import ErgoConfigs from "../../../../src/chains/ergo/helpers/ErgoConfigs";

class TestBoxes {

    static testBankAddress = ErgoConfigs.bankAddress
    static testBlockchainHeight = TestConfigs.ergo.blockchainHeight

    /**
     * returns BoxValue object for arbitrary amount of Erg
     */
    static ergToBoxValue = (erg: number): BoxValue => Utils.boxValueFromString(this.ergToNanoErgString(erg))

    /**
     * returns string representation for arbitrary amount of Erg
     */
    static ergToNanoErgString = (erg: number): string => (BigInt(erg) * BigInt(1000000000)).toString()

    /**
     * converts an ErgoBox object to Box interface
     */
    static convertErgoBoxToBoxObject = (ergoBox: ErgoBox): Box => JsonBI.parse(ergoBox.to_json())

    /**
     * generates a mocked event trigger for Erg payment in ergo chain
     */
    static mockErgPaymentEventTrigger = (): EventTrigger => {
        return new EventTrigger("", "ergo", "",
            "9hCPp7N4foJ68kPEwMMEa8tCsXVTDoLvXbdkm8s5Ht7Dpnc3L2t",
            "50000000000", "1000000000", "1500000", "",
            "erg", TestUtils.generateRandomId(), "",
            Array(5).fill(0).map(() => TestUtils.generateRandomId())
        )
    }

    /**
     * generates a mocked event trigger for token payment in ergo chain
     */
    static mockTokenPaymentEventTrigger = (): EventTrigger => {
        return new EventTrigger("", "ergo", "",
            "9hCPp7N4foJ68kPEwMMEa8tCsXVTDoLvXbdkm8s5Ht7Dpnc3L2t",
            "80", "10", "5", "",
            "907a31bdadad63e44e5b3a132eb5be218e694270fae6fa55b197ecccac19f87e", TestUtils.generateRandomId(), "",
            Array(5).fill(0).map(() => TestUtils.generateRandomId())
        )
    }

    /**
     * generates a mocked event trigger for Erg payment in ergo chain
     */
    static mockErgRewardEventTrigger = (): EventTrigger => {
        return new EventTrigger("ergo", "", "",
            "9hCPp7N4foJ68kPEwMMEa8tCsXVTDoLvXbdkm8s5Ht7Dpnc3L2t",
            "50000000000", "1000000000", "1500000", "erg",
            "", TestUtils.generateRandomId(), "",
            Array(5).fill(0).map(() => TestUtils.generateRandomId())
        )
    }

    /**
     * generates a mocked event trigger for token payment in ergo chain
     */
    static mockTokenRewardEventTrigger = (): EventTrigger => {
        return new EventTrigger("ergo", "", "",
            "9hCPp7N4foJ68kPEwMMEa8tCsXVTDoLvXbdkm8s5Ht7Dpnc3L2t",
            "80", "10", "5", "907a31bdadad63e44e5b3a132eb5be218e694270fae6fa55b197ecccac19f87e",
            "", TestUtils.generateRandomId(), "",
            Array(5).fill(0).map(() => TestUtils.generateRandomId())
        )
    }

    /**
     * generates 3 input boxes for ergo bank address
     */
    static mockBankBoxes = (): CoveringErgoBoxes => {
        const targetTokenId = "907a31bdadad63e44e5b3a132eb5be218e694270fae6fa55b197ecccac19f87e"
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
        return {
            covered: true,
            boxes: [box1, box2, box3]
        }
    }

    /**
     * generates a mocked payment transaction that transfers a token
     * @param event token payment event trigger
     */
    static mockTokenTransferringPaymentTransaction = (event: EventTrigger): PaymentTransaction => {
        const targetAddressErgoTree: string = Utils.addressStringToErgoTreeString(event.toAddress)
        const bankAddressErgoTree: string = Utils.addressStringToErgoTreeString(this.testBankAddress)

        const inBoxes = ErgoBoxes.empty()
        const bankBoxes = this.mockBankBoxes()
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
    static mockErgTransferringPaymentTransaction = (event: EventTrigger): PaymentTransaction => {
        const targetAddressErgoTree: string = Utils.addressStringToErgoTreeString(event.toAddress)
        const bankAddressErgoTree: string = Utils.addressStringToErgoTreeString(this.testBankAddress)

        const inBoxes = ErgoBoxes.empty()
        const bankBoxes = this.mockBankBoxes()
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
    static mockMultipleTokensTransferringPaymentTransaction = (event: EventTrigger): PaymentTransaction => {
        const targetAddressErgoTree: string = Utils.addressStringToErgoTreeString(event.toAddress)
        const bankAddressErgoTree: string = Utils.addressStringToErgoTreeString(this.testBankAddress)

        const inBoxes = ErgoBoxes.empty()
        const bankBoxes = this.mockBankBoxes()
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
    static mockWrongTokenTransferringPaymentTransaction = (event: EventTrigger): PaymentTransaction => {
        const targetAddressErgoTree: string = Utils.addressStringToErgoTreeString(event.toAddress)
        const bankAddressErgoTree: string = Utils.addressStringToErgoTreeString(this.testBankAddress)

        const inBoxes = ErgoBoxes.empty()
        const bankBoxes = this.mockBankBoxes()
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
     * generates an input box for arbitrary address
     */
    static mockSingleBox = (value: number, assets: Asset[], addressContract: Contract): ErgoBox => {
        const boxTokens: Tokens = new Tokens()
        assets.forEach(asset =>
            boxTokens.add(new Token(TokenId.from_str(asset.tokenId), TokenAmount.from_i64(Utils.i64FromBigint(asset.amount))))
        )

        return new ErgoBox(
            this.ergToBoxValue(value),
            this.testBlockchainHeight,
            addressContract,
            TxId.from_str(TestUtils.generateRandomId()),
            0,
            boxTokens
        )
    }

    /**
     * generates an input box for ergo bank address
     */
    static mockSingleBankBox = (value: number, assets: Asset[]): ErgoBox => this.mockSingleBox(
        value,
        assets,
        Utils.addressStringToContract(this.testBankAddress)
    )

    /**
     * generates 14 input boxes for ergo bank address
     */
    static mockManyBankBoxes = (): Boxes => {
        const targetTokenId = "907a31bdadad63e44e5b3a132eb5be218e694270fae6fa55b197ecccac19f87e"
        const secondTokenId = "068354ba0c3990e387a815278743577d8b2d098cad21c95dc795e3ae721cf906"
        const randomTokenId: string = TestUtils.generateRandomId()

        const box1: ErgoBox = this.mockSingleBankBox(
            30,
            [
                {
                    tokenId: targetTokenId,
                    amount: BigInt("44")
                },
                {
                    tokenId: secondTokenId,
                    amount: BigInt("100")
                }
            ]
        )

        const box2: ErgoBox = this.mockSingleBankBox(
            100,
            [
                {
                    tokenId: targetTokenId,
                    amount: BigInt("35")
                },
                {
                    tokenId: randomTokenId,
                    amount: BigInt("100")
                }
            ]
        )

        const box3: ErgoBox = this.mockSingleBankBox(
            10,
            [
                {
                    tokenId: secondTokenId,
                    amount: BigInt("123456789123456789")
                }
            ]
        )

        const middleBoxesArray: ErgoBox[] = Array(10).fill(0).map(() => this.mockSingleBankBox(10, []))

        const box14: ErgoBox = this.mockSingleBankBox(
            1,
            [
                {
                    tokenId: targetTokenId,
                    amount: BigInt("35")
                },
                {
                    tokenId: randomTokenId,
                    amount: BigInt("100")
                }
            ]
        )

        return {
            items: [box1, box2, box3].concat(middleBoxesArray).concat([box14]).map(box => this.convertErgoBoxToBoxObject(box)),
            total: 14
        }
    }

    /**
     * generates an event box with 5 WIDs and 2 commitment boxes
     */
    static mockEventBoxWithSomeCommitments = (): ErgoBox[] => {
        const rwtTokenId: string = TestUtils.generateRandomId()
        const eventBox: ErgoBox = this.mockSingleBox(
            5 * 100000,
            [
                {
                    tokenId: rwtTokenId,
                    amount: BigInt("5")
                }
            ],
            Utils.addressStringToContract(this.testBankAddress) // TODO: change this to trigger event contract
        )
        const commitmentBoxes: ErgoBox[] = Array(2).fill(0).map(() => this.mockSingleBox(
            100000,
            [
                {
                    tokenId: rwtTokenId,
                    amount: BigInt("1")
                }
            ],
            Utils.addressStringToContract(this.testBankAddress) // TODO: change this to commitment contract
        ))
        return [eventBox].concat(commitmentBoxes)
    }

}

export default TestBoxes
