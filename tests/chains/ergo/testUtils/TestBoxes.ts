import { EventTrigger } from "../../../../src/models/Models";
import TestUtils from "../../../testUtils/TestUtils";
import { CoveringErgoBoxes } from "../../../../src/chains/ergo/models/Interfaces";
import { BoxValue, ErgoBox, I64, Token, TokenAmount, TokenId, Tokens, TxId } from "ergo-lib-wasm-nodejs";
import Utils from "../../../../src/chains/ergo/helpers/Utils";

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

}

export default TestBoxes
