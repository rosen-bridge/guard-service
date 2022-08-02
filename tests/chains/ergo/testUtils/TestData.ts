import { Asset, ErgoBlockHeader, Register } from "../../../../src/chains/ergo/models/Interfaces";
import { BlockHeaders, ErgoStateContext, PreHeader } from "ergo-lib-wasm-nodejs";

class TestData {

    /**
     * a mocked data that represents 10 block headers
     */
    static mockedBlockHeaderJson: ErgoBlockHeader[] = Array(10).fill({
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
    })
    static mockedBlockHeaders = BlockHeaders.from_json(TestData.mockedBlockHeaderJson)
    static mockedErgoStateContext: ErgoStateContext = new ErgoStateContext(
        PreHeader.from_block_header(this.mockedBlockHeaders.get(0)),
        this.mockedBlockHeaders
    )

    static mockTransactionInputBoxes = (boxIds: string[]): string => `[
        ${boxIds.map(id => `{
            "boxId": "${id}",
            "extension": {}
        }`).join(",")}
    ]`

    static mockTransactionFeeBox = `{
        "value": 1500000,
        "ergoTree": "1005040004000e36100204a00b08cd0279be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798ea02d192a39a8cc7a701730073011001020402d19683030193a38cc7b2a57300000193c2b2a57301007473027303830108cdeeac93b1a57304",
        "assets": null,
        "additionalRegisters": {},
        "creationHeight": 100000
    }`

    static tokenTransferringErgPaymentTransactionString = (boxIds: string[], targetAddressErgoTree: string,
                                                           watcherBoxes: string[], bridgeFeeErgoTree: string,
                                                           networkFeeErgoTree: string, bankAddressErgoTree: string): string  => `{
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
                    }
                ],
                "additionalRegisters": {},
                "creationHeight": 100000
            },
            ${watcherBoxes.join(",")},
            {
                "value": 100000,
                "ergoTree": "${bridgeFeeErgoTree}",
                "assets": [
                    {
                        "tokenId": "907a31bdadad63e44e5b3a132eb5be218e694270fae6fa55b197ecccac19f87e",
                        "amount": 13
                    }
                ],
                "additionalRegisters": {},
                "creationHeight": 100000
            },
            {
                "value": 100000,
                "ergoTree": "${networkFeeErgoTree}",
                "assets": [
                    {   
                        "tokenId": "907a31bdadad63e44e5b3a132eb5be218e694270fae6fa55b197ecccac19f87e",
                        "amount": 5
                    }
                ],
                "additionalRegisters": {},
                "creationHeight": 100000
            },
            {
                "value": 139998600000,
                "ergoTree": "${bankAddressErgoTree}",
                "assets": [
                    {
                        "tokenId": "907a31bdadad63e44e5b3a132eb5be218e694270fae6fa55b197ecccac19f87e",
                        "amount": 9
                    },
                    {
                        "tokenId": "e2b7b6ab2a7c6dfc6a82cc648f3b16b76db1cf19e93b7ac35a4898c06e4d08ce",
                        "amount": 100
                    }
                ],
                "additionalRegisters": {},
                "creationHeight": 100000
            },
            ${this.mockTransactionFeeBox}
        ]
    }`

    static ergOnlyTokenPaymentTransactionString = (boxIds: string[], targetAddressErgoTree: string,
                                                   watcherBoxes: string[], bridgeFeeErgoTree: string,
                                                   networkFeeErgoTree: string, bankAddressErgoTree: string): string  => `{
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
            ${watcherBoxes.join(",")},
            {
                "value": 100000,
                "ergoTree": "${bridgeFeeErgoTree}",
                "assets": [
                    {
                        "tokenId": "907a31bdadad63e44e5b3a132eb5be218e694270fae6fa55b197ecccac19f87e",
                        "amount": 13
                    }
                ],
                "additionalRegisters": {},
                "creationHeight": 100000
            },
            {
                "value": 100000,
                "ergoTree": "${networkFeeErgoTree}",
                "assets": [
                    {   
                        "tokenId": "907a31bdadad63e44e5b3a132eb5be218e694270fae6fa55b197ecccac19f87e",
                        "amount": 5
                    }
                ],
                "additionalRegisters": {},
                "creationHeight": 100000
            },
            {
                "value": 139998600000,
                "ergoTree": "${bankAddressErgoTree}",
                "assets": [
                    {
                        "tokenId": "907a31bdadad63e44e5b3a132eb5be218e694270fae6fa55b197ecccac19f87e",
                        "amount": 74
                    },
                    {
                        "tokenId": "e2b7b6ab2a7c6dfc6a82cc648f3b16b76db1cf19e93b7ac35a4898c06e4d08ce",
                        "amount": 100
                    }
                ],
                "additionalRegisters": {},
                "creationHeight": 100000
            },
            ${this.mockTransactionFeeBox}
        ]
    }`

    static multipleTokenTransferringTokenPaymentTransactionString = (boxIds: string[], targetAddressErgoTree: string,
                                                                     watcherBoxes: string[], bridgeFeeErgoTree: string,
                                                                     networkFeeErgoTree: string, bankAddressErgoTree: string): string  => `{
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
                        "tokenId": "e2b7b6ab2a7c6dfc6a82cc648f3b16b76db1cf19e93b7ac35a4898c06e4d08ce",
                        "amount": 10
                    }
                ],
                "additionalRegisters": {},
                "creationHeight": 100000
            },
            ${watcherBoxes.join(",")},
            {
                "value": 100000,
                "ergoTree": "${bridgeFeeErgoTree}",
                "assets": [
                    {
                        "tokenId": "907a31bdadad63e44e5b3a132eb5be218e694270fae6fa55b197ecccac19f87e",
                        "amount": 13
                    }
                ],
                "additionalRegisters": {},
                "creationHeight": 100000
            },
            {
                "value": 100000,
                "ergoTree": "${networkFeeErgoTree}",
                "assets": [
                    {   
                        "tokenId": "907a31bdadad63e44e5b3a132eb5be218e694270fae6fa55b197ecccac19f87e",
                        "amount": 5
                    }
                ],
                "additionalRegisters": {},
                "creationHeight": 100000
            },
            {
                "value": 139998600000,
                "ergoTree": "${bankAddressErgoTree}",
                "assets": [
                    {
                        "tokenId": "907a31bdadad63e44e5b3a132eb5be218e694270fae6fa55b197ecccac19f87e",
                        "amount": 9
                    },
                    {
                        "tokenId": "e2b7b6ab2a7c6dfc6a82cc648f3b16b76db1cf19e93b7ac35a4898c06e4d08ce",
                        "amount": 90
                    }
                ],
                "additionalRegisters": {},
                "creationHeight": 100000
            },
            ${this.mockTransactionFeeBox}
        ]
    }`

    static wrongTokenTransferringTokenPaymentTransactionString = (boxIds: string[], targetAddressErgoTree: string,
                                                                  watcherBoxes: string[], bridgeFeeErgoTree: string,
                                                                  networkFeeErgoTree: string, bankAddressErgoTree: string): string  => `{
        "inputs": ${this.mockTransactionInputBoxes(boxIds)},
        "dataInputs": [],
        "outputs": [
            {
                "value": 100000,
                "ergoTree": "${targetAddressErgoTree}",
                "assets": [
                    {
                        "tokenId": "e2b7b6ab2a7c6dfc6a82cc648f3b16b76db1cf19e93b7ac35a4898c06e4d08ce",
                        "amount": 65
                    }
                ],
                "additionalRegisters": {},
                "creationHeight": 100000
            },
            ${watcherBoxes.join(",")},
            {
                "value": 100000,
                "ergoTree": "${bridgeFeeErgoTree}",
                "assets": [
                    {
                        "tokenId": "907a31bdadad63e44e5b3a132eb5be218e694270fae6fa55b197ecccac19f87e",
                        "amount": 13
                    }
                ],
                "additionalRegisters": {},
                "creationHeight": 100000
            },
            {
                "value": 100000,
                "ergoTree": "${networkFeeErgoTree}",
                "assets": [
                    {   
                        "tokenId": "907a31bdadad63e44e5b3a132eb5be218e694270fae6fa55b197ecccac19f87e",
                        "amount": 5
                    }
                ],
                "additionalRegisters": {},
                "creationHeight": 100000
            },
            {
                "value": 139998600000,
                "ergoTree": "${bankAddressErgoTree}",
                "assets": [
                    {
                        "tokenId": "907a31bdadad63e44e5b3a132eb5be218e694270fae6fa55b197ecccac19f87e",
                        "amount": 74
                    },
                    {
                        "tokenId": "e2b7b6ab2a7c6dfc6a82cc648f3b16b76db1cf19e93b7ac35a4898c06e4d08ce",
                        "amount": 35
                    }
                ],
                "additionalRegisters": {},
                "creationHeight": 100000
            },
            ${this.mockTransactionFeeBox}
        ]
    }`

    static tokenTransferringErgRewardDistributionTxString = (boxIds: string[], watcherBoxes: string[], bridgeFeeErgoTree: string, networkFeeErgoTree: string, bankAddressErgoTree: string): string  => `{
        "inputs": ${this.mockTransactionInputBoxes(boxIds)},
        "dataInputs": [],
        "outputs": [
            ${watcherBoxes.join(",")},
            {
                "value": 500000003,
                "ergoTree": "${bridgeFeeErgoTree}",
                "assets": [
                    {
                        "tokenId": "907a31bdadad63e44e5b3a132eb5be218e694270fae6fa55b197ecccac19f87e",
                        "amount": 13
                    }
                ],
                "additionalRegisters": {},
                "creationHeight": 100000
            },
            {
                "value": 1500000,
                "ergoTree": "${networkFeeErgoTree}",
                "assets": [
                    {   
                        "tokenId": "907a31bdadad63e44e5b3a132eb5be218e694270fae6fa55b197ecccac19f87e",
                        "amount": 5
                    }
                ],
                "additionalRegisters": {},
                "creationHeight": 100000
            },
            {
                "value": 138997400000,
                "ergoTree": "${bankAddressErgoTree}",
                "assets": [
                    {
                        "tokenId": "907a31bdadad63e44e5b3a132eb5be218e694270fae6fa55b197ecccac19f87e",
                        "amount": 54
                    },
                    {
                        "tokenId": "e2b7b6ab2a7c6dfc6a82cc648f3b16b76db1cf19e93b7ac35a4898c06e4d08ce",
                        "amount": 100
                    }
                ],
                "additionalRegisters": {},
                "creationHeight": 100000
            },
            ${this.mockTransactionFeeBox}
        ]
    }`

    static tokenRewardDistributionTxString = (boxIds: string[], watcherBoxes: string[], bridgeFeeErgoTree: string, networkFeeErgoTree: string, bankAddressErgoTree: string): string  => `{
        "inputs": ${this.mockTransactionInputBoxes(boxIds)},
        "dataInputs": [],
        "outputs": [
            ${watcherBoxes.join(",")},
            {
                "value": 100000,
                "ergoTree": "${bridgeFeeErgoTree}",
                "assets": [
                    {
                        "tokenId": "907a31bdadad63e44e5b3a132eb5be218e694270fae6fa55b197ecccac19f87e",
                        "amount": 13
                    }
                ],
                "additionalRegisters": {},
                "creationHeight": 100000
            },
            {
                "value": 100000,
                "ergoTree": "${networkFeeErgoTree}",
                "assets": [
                    {   
                        "tokenId": "907a31bdadad63e44e5b3a132eb5be218e694270fae6fa55b197ecccac19f87e",
                        "amount": 5
                    }
                ],
                "additionalRegisters": {},
                "creationHeight": 100000
            },
            {
                "value": 139998700000,
                "ergoTree": "${bankAddressErgoTree}",
                "assets": [
                    {
                        "tokenId": "907a31bdadad63e44e5b3a132eb5be218e694270fae6fa55b197ecccac19f87e",
                        "amount": 54
                    },
                    {
                        "tokenId": "e2b7b6ab2a7c6dfc6a82cc648f3b16b76db1cf19e93b7ac35a4898c06e4d08ce",
                        "amount": 100
                    }
                ],
                "additionalRegisters": {},
                "creationHeight": 100000
            },
            ${this.mockTransactionFeeBox}
        ]
    }`

    static illegalChangeBoxTokenRewardDistributionTxString = (boxIds: string[], watcherBoxes: string[], bridgeFeeErgoTree: string, networkFeeErgoTree: string, nonBankAddressErgoTree: string): string  => `{
        "inputs": ${this.mockTransactionInputBoxes(boxIds)},
        "dataInputs": [],
        "outputs": [
            ${watcherBoxes.join(",")},
            {
                "value": 100000,
                "ergoTree": "${bridgeFeeErgoTree}",
                "assets": [
                    {
                        "tokenId": "907a31bdadad63e44e5b3a132eb5be218e694270fae6fa55b197ecccac19f87e",
                        "amount": 13
                    }
                ],
                "additionalRegisters": {},
                "creationHeight": 100000
            },
            {
                "value": 100000,
                "ergoTree": "${networkFeeErgoTree}",
                "assets": [
                    {   
                        "tokenId": "907a31bdadad63e44e5b3a132eb5be218e694270fae6fa55b197ecccac19f87e",
                        "amount": 5
                    }
                ],
                "additionalRegisters": {},
                "creationHeight": 100000
            },
            {
                "value": 139998700000,
                "ergoTree": "${nonBankAddressErgoTree}",
                "assets": [
                    {
                        "tokenId": "907a31bdadad63e44e5b3a132eb5be218e694270fae6fa55b197ecccac19f87e",
                        "amount": 54
                    },
                    {
                        "tokenId": "e2b7b6ab2a7c6dfc6a82cc648f3b16b76db1cf19e93b7ac35a4898c06e4d08ce",
                        "amount": 100
                    }
                ],
                "additionalRegisters": {},
                "creationHeight": 100000
            },
            ${this.mockTransactionFeeBox}
        ]
    }`

    static wrongTokenRewardDistributionTxString = (boxIds: string[], watcherBoxes: string[], bridgeFeeErgoTree: string, networkFeeErgoTree: string, bankAddressErgoTree: string): string  => `{
        "inputs": ${this.mockTransactionInputBoxes(boxIds)},
        "dataInputs": [],
        "outputs": [
            ${watcherBoxes.join(",")},
            {
                "value": 100000,
                "ergoTree": "${bridgeFeeErgoTree}",
                "assets": [
                    {
                        "tokenId": "e2b7b6ab2a7c6dfc6a82cc648f3b16b76db1cf19e93b7ac35a4898c06e4d08ce",
                        "amount": 13
                    }
                ],
                "additionalRegisters": {},
                "creationHeight": 100000
            },
            {
                "value": 100000,
                "ergoTree": "${networkFeeErgoTree}",
                "assets": [
                    {   
                        "tokenId": "e2b7b6ab2a7c6dfc6a82cc648f3b16b76db1cf19e93b7ac35a4898c06e4d08ce",
                        "amount": 5
                    }
                ],
                "additionalRegisters": {},
                "creationHeight": 100000
            },
            {
                "value": 139998700000,
                "ergoTree": "${bankAddressErgoTree}",
                "assets": [
                    {
                        "tokenId": "907a31bdadad63e44e5b3a132eb5be218e694270fae6fa55b197ecccac19f87e",
                        "amount": 79
                    },
                    {
                        "tokenId": "e2b7b6ab2a7c6dfc6a82cc648f3b16b76db1cf19e93b7ac35a4898c06e4d08ce",
                        "amount": 73
                    }
                ],
                "additionalRegisters": {},
                "creationHeight": 100000
            },
            ${this.mockTransactionFeeBox}
        ]
    }`

    static wrongTokenAmountRewardDistributionTxString = (boxIds: string[], watcherBoxes: string[], bridgeFeeErgoTree: string, networkFeeErgoTree: string, bankAddressErgoTree: string): string  => `{
        "inputs": ${this.mockTransactionInputBoxes(boxIds)},
        "dataInputs": [],
        "outputs": [
            ${watcherBoxes.join(",")},
            {
                "value": 100000,
                "ergoTree": "${bridgeFeeErgoTree}",
                "assets": [
                    {
                        "tokenId": "907a31bdadad63e44e5b3a132eb5be218e694270fae6fa55b197ecccac19f87e",
                        "amount": 13
                    }
                ],
                "additionalRegisters": {},
                "creationHeight": 100000
            },
            {
                "value": 100000,
                "ergoTree": "${networkFeeErgoTree}",
                "assets": [
                    {   
                        "tokenId": "907a31bdadad63e44e5b3a132eb5be218e694270fae6fa55b197ecccac19f87e",
                        "amount": 5
                    }
                ],
                "additionalRegisters": {},
                "creationHeight": 100000
            },
            {
                "value": 139998700000,
                "ergoTree": "${bankAddressErgoTree}",
                "assets": [
                    {
                        "tokenId": "907a31bdadad63e44e5b3a132eb5be218e694270fae6fa55b197ecccac19f87e",
                        "amount": 47
                    },
                    {
                        "tokenId": "e2b7b6ab2a7c6dfc6a82cc648f3b16b76db1cf19e93b7ac35a4898c06e4d08ce",
                        "amount": 100
                    }
                ],
                "additionalRegisters": {},
                "creationHeight": 100000
            },
            ${this.mockTransactionFeeBox}
        ]
    }`

    static mockWatcherPermitBox = (value: bigint, assets: Asset[], boxErgoTree: string, registers: Register[]): string => `{
        "value": ${value.toString()},
        "ergoTree": "${boxErgoTree}",
        "assets": [
            ${assets.map(asset => `{
                "tokenId": "${asset.tokenId}",
                "amount": ${asset.amount}
            }`).join(",")}
        ],
        "additionalRegisters": {
            ${registers.map(reg => `"R${reg.registerId}": "${reg.value.encode_to_base16()}"`).join(",")}
        },
        "creationHeight": 100000
    }`

    static tokenPaymentTransactionString = (boxIds: string[], targetAddressErgoTree: string,
                                            watcherBoxes: string[], bridgeFeeErgoTree: string,
                                            networkFeeErgoTree: string, bankAddressErgoTree: string,
                                            tokenId: string): string  => `{
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
                    }
                ],
                "additionalRegisters": {},
                "creationHeight": 100000
            },
            ${watcherBoxes.join(",")},
            {
                "value": 100000,
                "ergoTree": "${bridgeFeeErgoTree}",
                "assets": [
                    {
                        "tokenId": "907a31bdadad63e44e5b3a132eb5be218e694270fae6fa55b197ecccac19f87e",
                        "amount": 13
                    }
                ],
                "additionalRegisters": {},
                "creationHeight": 100000
            },
            {
                "value": 100000,
                "ergoTree": "${networkFeeErgoTree}",
                "assets": [
                    {   
                        "tokenId": "907a31bdadad63e44e5b3a132eb5be218e694270fae6fa55b197ecccac19f87e",
                        "amount": 5
                    }
                ],
                "additionalRegisters": {},
                "creationHeight": 100000
            },
            {
                "value": 139998600000,
                "ergoTree": "${bankAddressErgoTree}",
                "assets": [
                    {
                        "tokenId": "907a31bdadad63e44e5b3a132eb5be218e694270fae6fa55b197ecccac19f87e",
                        "amount": 9
                    },
                    {
                        "tokenId": "${tokenId}",
                        "amount": 99
                    }
                ],
                "additionalRegisters": {},
                "creationHeight": 100000
            },
            ${this.mockTransactionFeeBox}
        ]
    }`

    static ergPaymentTransactionString = (boxIds: string[], targetAddressErgoTree: string,
                                            watcherBoxes: string[], bridgeFeeErgoTree: string,
                                            networkFeeErgoTree: string, bankAddressErgoTree: string,
                                            tokenId: string): string  => `{
        "inputs": ${this.mockTransactionInputBoxes(boxIds)},
        "dataInputs": [],
        "outputs": [
            {
                "value": 48998500000,
                "ergoTree": "${targetAddressErgoTree}",
                "assets": null,
                "additionalRegisters": {},
                "creationHeight": 100000
            },
            ${watcherBoxes.join(",")},
            {
                "value": 500000003,
                "ergoTree": "${bridgeFeeErgoTree}",
                "assets": null,
                "additionalRegisters": {},
                "creationHeight": 100000
            },
            {
                "value": 1500000,
                "ergoTree": "${networkFeeErgoTree}",
                "assets": null,
                "additionalRegisters": {},
                "creationHeight": 100000
            },
            {
                "value": 89998900000,
                "ergoTree": "${bankAddressErgoTree}",
                "assets": [
                    {
                        "tokenId": "907a31bdadad63e44e5b3a132eb5be218e694270fae6fa55b197ecccac19f87e",
                        "amount": 99
                    },
                    {
                        "tokenId": "${tokenId}",
                        "amount": 99
                    }
                ],
                "additionalRegisters": {},
                "creationHeight": 100000
            },
            ${this.mockTransactionFeeBox}
        ]
    }`

    static tokenDistributionTxString = (boxIds: string[], watcherBoxes: string[], bridgeFeeErgoTree: string,
                                        networkFeeErgoTree: string, bankAddressErgoTree: string,
                                        tokenId: string): string  => `{
        "inputs": ${this.mockTransactionInputBoxes(boxIds)},
        "dataInputs": [],
        "outputs": [
            ${watcherBoxes.join(",")},
            {
                "value": 100000,
                "ergoTree": "${bridgeFeeErgoTree}",
                "assets": [
                    {
                        "tokenId": "907a31bdadad63e44e5b3a132eb5be218e694270fae6fa55b197ecccac19f87e",
                        "amount": 13
                    }
                ],
                "additionalRegisters": {},
                "creationHeight": 100000
            },
            {
                "value": 100000,
                "ergoTree": "${networkFeeErgoTree}",
                "assets": [
                    {   
                        "tokenId": "907a31bdadad63e44e5b3a132eb5be218e694270fae6fa55b197ecccac19f87e",
                        "amount": 5
                    }
                ],
                "additionalRegisters": {},
                "creationHeight": 100000
            },
            {
                "value": 139998700000,
                "ergoTree": "${bankAddressErgoTree}",
                "assets": [
                    {
                        "tokenId": "907a31bdadad63e44e5b3a132eb5be218e694270fae6fa55b197ecccac19f87e",
                        "amount": 74
                    },
                    {
                        "tokenId": "${tokenId}",
                        "amount": 99
                    }
                ],
                "additionalRegisters": {},
                "creationHeight": 100000
            },
            ${this.mockTransactionFeeBox}
        ]
    }`

    static ergDistributionTxString = (boxIds: string[], watcherBoxes: string[], bridgeFeeErgoTree: string,
                                        networkFeeErgoTree: string, bankAddressErgoTree: string,
                                        tokenId: string): string  => `{
        "inputs": ${this.mockTransactionInputBoxes(boxIds)},
        "dataInputs": [],
        "outputs": [
            ${watcherBoxes.join(",")},
            {
                "value": 500000003,
                "ergoTree": "${bridgeFeeErgoTree}",
                "assets": null,
                "additionalRegisters": {},
                "creationHeight": 100000
            },
            {
                "value": 1500000,
                "ergoTree": "${networkFeeErgoTree}",
                "assets": null,
                "additionalRegisters": {},
                "creationHeight": 100000
            },
            {
                "value": 138997400000,
                "ergoTree": "${bankAddressErgoTree}",
                "assets": [
                    {
                        "tokenId": "907a31bdadad63e44e5b3a132eb5be218e694270fae6fa55b197ecccac19f87e",
                        "amount": 99
                    },
                    {
                        "tokenId": "${tokenId}",
                        "amount": 99
                    }
                ],
                "additionalRegisters": {},
                "creationHeight": 100000
            },
            ${this.mockTransactionFeeBox}
        ]
    }`

    static mockWrongAmountRSNOnlyRewardTx = (boxIds: string[], watcherBoxes: string[], bridgeFeeErgoTree: string,
                                             networkFeeErgoTree: string, bankAddressErgoTree: string,
                                             tokenId: string, rsnTokenId: string): string  => `{
        "inputs": ${this.mockTransactionInputBoxes(boxIds)},
        "dataInputs": [],
        "outputs": [
            ${watcherBoxes.join(",")},
            {
                "value": 1000000000,
                "ergoTree": "${bridgeFeeErgoTree}",
                "assets": [
                    {
                        "tokenId": "${rsnTokenId}",
                        "amount": 282011
                    }
                ],
                "additionalRegisters": {},
                "creationHeight": 100000
            },
            {
                "value": 1500000,
                "ergoTree": "${networkFeeErgoTree}",
                "assets": [],
                "additionalRegisters": {},
                "creationHeight": 100000
            },
            {
                "value": 138997400000,
                "ergoTree": "${bankAddressErgoTree}",
                "assets": [
                    {
                        "tokenId": "907a31bdadad63e44e5b3a132eb5be218e694270fae6fa55b197ecccac19f87e",
                        "amount": 99
                    },
                    {
                        "tokenId": "${tokenId}",
                        "amount": 100
                    },
                    {
                        "tokenId": "${rsnTokenId}",
                        "amount": 9999529990
                    }
                ],
                "additionalRegisters": {},
                "creationHeight": 100000
            },
            ${this.mockTransactionFeeBox}
        ]
    }`

    static mockWrongAmountRSNOnlyPaymentTx = (boxIds: string[], targetAddressErgoTree: string,
                                                           watcherBoxes: string[], bridgeFeeErgoTree: string,
                                                           networkFeeErgoTree: string, bankAddressErgoTree: string,
                                                           tokenId: string, rsnTokenId: string): string  => `{
        "inputs": ${this.mockTransactionInputBoxes(boxIds)},
        "dataInputs": [],
        "outputs": [
            {
                "value": 48998500000,
                "ergoTree": "${targetAddressErgoTree}",
                "assets": [],
                "additionalRegisters": {},
                "creationHeight": 100000
            },
            ${watcherBoxes.join(",")},
            {
                "value": 1000000000,
                "ergoTree": "${bridgeFeeErgoTree}",
                "assets": [
                    {
                        "tokenId": "db6df45d3ed738ff4ff48d3cdf50ba0e5c3018bc088430a33e700073d2390ba4",
                        "amount": 283001
                    }
                ],
                "additionalRegisters": {},
                "creationHeight": 100000
            },
            {
                "value": 1500000,
                "ergoTree": "${networkFeeErgoTree}",
                "assets": [],
                "additionalRegisters": {},
                "creationHeight": 100000
            },
            {
                "value": 89998900000,
                "ergoTree": "${bankAddressErgoTree}",
                "assets": [
                    {
                        "tokenId": "907a31bdadad63e44e5b3a132eb5be218e694270fae6fa55b197ecccac19f87e",
                        "amount": 99
                    },
                    {
                        "tokenId": "${tokenId}",
                        "amount": 100
                    },
                    {
                        "tokenId": "${rsnTokenId}",
                        "amount": 9999529000
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
