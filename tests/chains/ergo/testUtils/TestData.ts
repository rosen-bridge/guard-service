import { ErgoBlockHeader } from "../../../../src/chains/ergo/models/Interfaces";
import TestUtils from "../../../testUtils/TestUtils";
import { BlockHeaders, ErgoStateContext, PreHeader } from "ergo-lib-wasm-nodejs";

class TestData {

    /**
     * a mocked data that represents 10 block headers
     */
    static mockedBlockHeaderJson: ErgoBlockHeader[] = Array.apply(null, Array(10)).map((_: ErgoBlockHeader) => {
        return {
            "extensionId": "0000000000000000000000000000000000000000000000000000000000000000",
            "difficulty": "5275058176",
            "votes": "000000",
            "timestamp": 0,
            "size": 220,
            "stateRoot": "000000000000000000000000000000000000000000000000000000000000000000",
            "height": 100000,
            "nBits": 0,
            "version": 2,
            "id": "0000000000000000000000000000000000000000000000000000000000000000",
            "adProofsRoot": "0000000000000000000000000000000000000000000000000000000000000000",
            "transactionsRoot": "0000000000000000000000000000000000000000000000000000000000000000",
            "extensionHash": "0000000000000000000000000000000000000000000000000000000000000000",
            "powSolutions": {
                "pk": "03702266cae8daf75b7f09d4c23ad9cdc954849ee280eefae0d67bd97db4a68f6a",
                "w": "0279be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798",
                "n": "000000019cdfb631",
                "d": 0
            },
            "adProofsId": "0000000000000000000000000000000000000000000000000000000000000000",
            "transactionsId": "0000000000000000000000000000000000000000000000000000000000000000",
            "parentId": "0000000000000000000000000000000000000000000000000000000000000000"
        }
    })
    static mockedBlockHeaders = BlockHeaders.from_json(TestData.mockedBlockHeaderJson)
    static mockedErgoStateContext: ErgoStateContext = new ErgoStateContext(
        PreHeader.from_block_header(this.mockedBlockHeaders.get(0)),
        this.mockedBlockHeaders
    )

    static mockTransactionInputBoxes = (boxIds: string[]): string => `[
        {
            "boxId": "${boxIds[0]}",
            "extension": {}
        },
        {
            "boxId": "${boxIds[1]}",
            "extension": {}
        },
        {
            "boxId": "${boxIds[2]}",
            "extension": {}
        }
    ]`

    static mockTransactionFeeBox = `{
        "value": 1500000,
        "ergoTree": "1005040004000e36100204a00b08cd0279be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798ea02d192a39a8cc7a701730073011001020402d19683030193a38cc7b2a57300000193c2b2a57301007473027303830108cdeeac93b1a57304",
        "assets": null,
        "additionalRegisters": {},
        "creationHeight": 100000
    }`

    static tokenTransferringErgPaymentTransactionString = (boxIds: string[], targetAddressErgoTree: string, bankAddressErgoTree: string): string  => `{
        "inputs": ${this.mockTransactionInputBoxes(boxIds)},
        "dataInputs": [],
        "outputs": [
            {
                "value": 48998500000,
                "ergoTree": "${targetAddressErgoTree}",
                "assets": [
                    {
                        "tokenId": "907a31bdadad63e44e5b3a132eb5be218e694270fae6fa55b197ecccac19f87e",
                        "amount": 65
                    }
                ],
                "additionalRegisters": {},
                "creationHeight": 100000
            },
            {
                "value": 91000000000,
                "ergoTree": "${bankAddressErgoTree}",
                "assets": [
                    {
                        "tokenId": "907a31bdadad63e44e5b3a132eb5be218e694270fae6fa55b197ecccac19f87e",
                        "amount": 14
                    },
                    {
                        "tokenId": "3b9950fe883e60232e7f7bf2bfd24c73ab2c3635dc2b6aeb56c9819adfd97503",
                        "amount": 100
                    }
                ],
                "additionalRegisters": {},
                "creationHeight": 100000
            },
            ${this.mockTransactionFeeBox}
        ]
    }`

    static ergOnlyTokenPaymentTransactionString = (boxIds: string[], targetAddressErgoTree: string, bankAddressErgoTree: string): string  => `{
        "inputs": ${this.mockTransactionInputBoxes(boxIds)},
        "dataInputs": [],
        "outputs": [
            {
                "value": 100000,
                "ergoTree": "${targetAddressErgoTree}",
                "assets": null,
                "additionalRegisters": {},
                "creationHeight": 100000
            },
            {
                "value": 139998400000,
                "ergoTree": "${bankAddressErgoTree}",
                "assets": [
                    {
                        "tokenId": "907a31bdadad63e44e5b3a132eb5be218e694270fae6fa55b197ecccac19f87e",
                        "amount": 79
                    },
                    {
                        "tokenId": "c5995b75b3e85aea4ccd64fdec0b47f138bb56aeb569df250f9c338d9820c4a0",
                        "amount": 100
                    }
                ],
                "additionalRegisters": {},
                "creationHeight": 100000
            },
            ${this.mockTransactionFeeBox}
        ]
    }`

    static multipleTokenTransferringTokenPaymentTransactionString = (boxIds: string[], targetAddressErgoTree: string, bankAddressErgoTree: string): string  => `{
        "inputs": ${this.mockTransactionInputBoxes(boxIds)},
        "dataInputs": [],
        "outputs": [
            {
                "value": 100000,
                "ergoTree": "${targetAddressErgoTree}",
                "assets": [
                    {
                        "tokenId": "907a31bdadad63e44e5b3a132eb5be218e694270fae6fa55b197ecccac19f87e",
                        "amount": 65
                    },
                    {
                        "tokenId": "3b9950fe883e60232e7f7bf2bfd24c73ab2c3635dc2b6aeb56c9819adfd97503",
                        "amount": 100
                    }
                ],
                "additionalRegisters": {},
                "creationHeight": 100000
            },
            {
                "value": 139998400000,
                "ergoTree": "${bankAddressErgoTree}",
                "assets": [
                    {
                        "tokenId": "907a31bdadad63e44e5b3a132eb5be218e694270fae6fa55b197ecccac19f87e",
                        "amount": 14
                    }
                ],
                "additionalRegisters": {},
                "creationHeight": 100000
            },
            ${this.mockTransactionFeeBox}
        ]
    }`

    static wrongTokenTransferringTokenPaymentTransactionString = (boxIds: string[], targetAddressErgoTree: string, bankAddressErgoTree: string): string  => `{
        "inputs": ${this.mockTransactionInputBoxes(boxIds)},
        "dataInputs": [],
        "outputs": [
            {
                "value": 100000,
                "ergoTree": "${targetAddressErgoTree}",
                "assets": [
                    {
                        "tokenId": "3b9950fe883e60232e7f7bf2bfd24c73ab2c3635dc2b6aeb56c9819adfd97503",
                        "amount": 65
                    }
                ],
                "additionalRegisters": {},
                "creationHeight": 100000
            },
            {
                "value": 139998400000,
                "ergoTree": "${bankAddressErgoTree}",
                "assets": [
                    {
                        "tokenId": "907a31bdadad63e44e5b3a132eb5be218e694270fae6fa55b197ecccac19f87e",
                        "amount": 79
                    },
                    {
                        "tokenId": "3b9950fe883e60232e7f7bf2bfd24c73ab2c3635dc2b6aeb56c9819adfd97503",
                        "amount": 35
                    }
                ],
                "additionalRegisters": {},
                "creationHeight": 100000
            },
            ${this.mockTransactionFeeBox}
        ]
    }`

}

export default TestData
