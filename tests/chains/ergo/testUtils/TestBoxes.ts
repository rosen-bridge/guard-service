import { EventTrigger, TransactionTypes } from "../../../../src/models/Models";
import TestUtils from "../../../testUtils/TestUtils";
import { Asset, Box, Boxes, CoveringErgoBoxes, Register } from "../../../../src/chains/ergo/models/Interfaces";
import {
    BoxSelection,
    BoxValue, Constant, Contract,
    ErgoBox, ErgoBoxAssetsDataList, ErgoBoxCandidate, ErgoBoxCandidateBuilder, ErgoBoxCandidates, ErgoBoxes,
    I64, ReducedTransaction, SecretKey, SecretKeys,
    Token,
    TokenAmount,
    TokenId,
    Tokens, TxBuilder,
    TxId,
    UnsignedTransaction, Wallet
} from "ergo-lib-wasm-nodejs";
import ErgoUtils from "../../../../src/chains/ergo/helpers/ErgoUtils";
import TestData from "./TestData";
import { JsonBI } from "../../../../src/network/NetworkModels";
import TestConfigs from "../../../testUtils/TestConfigs";
import ErgoConfigs from "../../../../src/chains/ergo/helpers/ErgoConfigs";
import Contracts from "../../../../src/contracts/Contracts";
import Configs from "../../../../src/helpers/Configs";
import ErgoTransaction from "../../../../src/chains/ergo/models/ErgoTransaction";
import ChainsConstants from "../../../../src/chains/ChainsConstants";
import Utils from "../../../../src/helpers/Utils";
import InputBoxes from "../../../../src/chains/ergo/boxes/InputBoxes";

class TestBoxes {

    static testBankAddress = ErgoConfigs.bankAddress
    static testBlockchainHeight = TestConfigs.ergo.blockchainHeight
    static bridgeFeeErgoTree: string = ErgoUtils.addressStringToErgoTreeString(ErgoConfigs.bridgeFeeRepoAddress)
    static networkFeeErgoTree: string = ErgoUtils.addressStringToErgoTreeString(ErgoConfigs.networkFeeRepoAddress)
    static bankAddressErgoTree: string = ErgoUtils.addressStringToErgoTreeString(this.testBankAddress)

    /**
     * returns BoxValue object for arbitrary amount of Erg
     */
    static ergToBoxValue = (erg: number): BoxValue => ErgoUtils.boxValueFromString(this.ergToNanoErgString(erg))

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
        return new EventTrigger("", ChainsConstants.ergo, "",
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
        return new EventTrigger("", ChainsConstants.ergo, "",
            "9hCPp7N4foJ68kPEwMMEa8tCsXVTDoLvXbdkm8s5Ht7Dpnc3L2t",
            "90", "20", "5", "",
            "907a31bdadad63e44e5b3a132eb5be218e694270fae6fa55b197ecccac19f87e", TestUtils.generateRandomId(), "",
            Array(5).fill(0).map(() => TestUtils.generateRandomId())
        )
    }

    /**
     * generates a mocked event trigger for Erg payment in ergo chain
     */
    static mockErgRewardEventTrigger = (): EventTrigger => {
        return new EventTrigger(ChainsConstants.ergo, "", "",
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
        return new EventTrigger(ChainsConstants.ergo, "", "",
            "9hCPp7N4foJ68kPEwMMEa8tCsXVTDoLvXbdkm8s5Ht7Dpnc3L2t",
            "90", "20", "5", "907a31bdadad63e44e5b3a132eb5be218e694270fae6fa55b197ecccac19f87e",
            "", TestUtils.generateRandomId(), "",
            Array(5).fill(0).map(() => TestUtils.generateRandomId())
        )
    }

    /**
     * generates 3 input boxes for ergo bank address
     */
    static mockBankBoxes = (): CoveringErgoBoxes => {
        const targetTokenId = "907a31bdadad63e44e5b3a132eb5be218e694270fae6fa55b197ecccac19f87e"
        const rsnTokenId = Configs.rsn
        const randomTokenId: string = TestUtils.generateRandomId()

        const box1Tokens: Tokens = new Tokens()
        box1Tokens.add(new Token(TokenId.from_str(targetTokenId), TokenAmount.from_i64(I64.from_str("54"))))
        box1Tokens.add(new Token(TokenId.from_str(randomTokenId), TokenAmount.from_i64(I64.from_str("100"))))
        const box1: ErgoBox = new ErgoBox(
            this.ergToBoxValue(30),
            this.testBlockchainHeight + 5,
            ErgoUtils.addressStringToContract(this.testBankAddress),
            TxId.from_str(TestUtils.generateRandomId()),
            0,
            box1Tokens
        )
        const box2Tokens: Tokens = new Tokens()
        box2Tokens.add(new Token(TokenId.from_str(targetTokenId), TokenAmount.from_i64(I64.from_str("45"))))
        const box2: ErgoBox = new ErgoBox(
            this.ergToBoxValue(100),
            this.testBlockchainHeight,
            ErgoUtils.addressStringToContract(this.testBankAddress),
            TxId.from_str(TestUtils.generateRandomId()),
            0,
            box2Tokens
        )
        const box3Tokens: Tokens = new Tokens()
        box3Tokens.add(new Token(TokenId.from_str(rsnTokenId), TokenAmount.from_i64(I64.from_str("10000000000"))))
        const box3: ErgoBox = new ErgoBox(
            this.ergToBoxValue(10),
            this.testBlockchainHeight + 20,
            ErgoUtils.addressStringToContract(this.testBankAddress),
            TxId.from_str(TestUtils.generateRandomId()),
            2,
            box3Tokens
        )
        return {
            covered: true,
            boxes: [box1, box2, box3]
        }
    }

    /**
     * generates a mocked payment transaction that transfers a token
     * @param event token payment event trigger
     * @param eventBoxes event box and valid commitment boxes
     */
    static mockTokenTransferringPaymentTransaction = (event: EventTrigger, eventBoxes: ErgoBox[]): ErgoTransaction => {
        const targetAddressErgoTree: string = ErgoUtils.addressStringToErgoTreeString(event.toAddress)

        const inBoxes = ErgoBoxes.empty()
        eventBoxes.forEach(box => inBoxes.add(box))

        const rwtTokenId = Configs.ergoRWT
        const watcherBoxes = event.WIDs.map(wid => Utils.hexStringToUint8Array(wid))
            .concat(eventBoxes.slice(1).map(box => InputBoxes.getErgoBoxWID(box)))
            .map(wid => TestData.mockWatcherPermitBox(
                100000n,
                [
                    {
                        tokenId: rwtTokenId,
                        amount: BigInt("1")
                    },
                    {
                        tokenId: "907a31bdadad63e44e5b3a132eb5be218e694270fae6fa55b197ecccac19f87e",
                        amount: BigInt("1")
                    }
                ],
                Contracts.triggerEventErgoTree,
                [
                    {
                        registerId: 4,
                        value: Constant.from_coll_coll_byte([wid])
                    }
                ]
            ))

        const txJsonString: string = TestData.tokenTransferringErgPaymentTransactionString(
            eventBoxes.map(box => box.box_id().to_str()),
            targetAddressErgoTree,
            watcherBoxes,
            this.bridgeFeeErgoTree,
            this.networkFeeErgoTree,
            this.bankAddressErgoTree
        )
        const tx = UnsignedTransaction.from_json(txJsonString)

        const reducedTx = ReducedTransaction.from_unsigned_tx(tx, inBoxes, ErgoBoxes.empty(), TestData.mockedErgoStateContext)

        const txBytes = reducedTx.sigma_serialize_bytes()
        const txId = tx.id().to_str()
        const eventId = event.sourceTxId
        return new ErgoTransaction(txId, eventId, txBytes, [], [], TransactionTypes.payment)
    }

    /**
     * generates a mocked payment transaction that only transfers erg
     * @param event erg payment event trigger
     * @param eventBoxes event box and valid commitment boxes
     */
    static mockErgTransferringPaymentTransaction = (event: EventTrigger, eventBoxes: ErgoBox[]): ErgoTransaction => {
        const targetAddressErgoTree: string = ErgoUtils.addressStringToErgoTreeString(event.toAddress)

        const inBoxes = ErgoBoxes.empty()
        eventBoxes.forEach(box => inBoxes.add(box))

        const rwtTokenId = Configs.ergoRWT
        const watcherBoxes = event.WIDs.map(wid => Utils.hexStringToUint8Array(wid))
            .concat(eventBoxes.slice(1).map(box => InputBoxes.getErgoBoxWID(box)))
            .map(wid => TestData.mockWatcherPermitBox(
                100000n,
                [
                    {
                        tokenId: rwtTokenId,
                        amount: BigInt("1")
                    },
                    {
                        tokenId: "907a31bdadad63e44e5b3a132eb5be218e694270fae6fa55b197ecccac19f87e",
                        amount: BigInt("1")
                    }
                ],
                Contracts.triggerEventErgoTree,
                [
                    {
                        registerId: 4,
                        value: Constant.from_coll_coll_byte([wid])
                    }
                ]
            ))

        const txJsonString: string = TestData.ergOnlyTokenPaymentTransactionString(
            eventBoxes.map(box => box.box_id().to_str()),
            targetAddressErgoTree,
            watcherBoxes,
            this.bridgeFeeErgoTree,
            this.networkFeeErgoTree,
            this.bankAddressErgoTree
        )
        const tx = UnsignedTransaction.from_json(txJsonString)

        const reducedTx = ReducedTransaction.from_unsigned_tx(tx, inBoxes, ErgoBoxes.empty(), TestData.mockedErgoStateContext)

        const txBytes = reducedTx.sigma_serialize_bytes()
        const txId = tx.id().to_str()
        const eventId = event.sourceTxId
        return new ErgoTransaction(txId, eventId, txBytes, [], [], TransactionTypes.payment)
    }

    /**
     * generates a mocked payment transaction that transfers two tokens
     * @param event token payment event trigger
     * @param eventBoxes event box and valid commitment boxes
     */
    static mockMultipleTokensTransferringPaymentTransaction = (event: EventTrigger, eventBoxes: ErgoBox[]): ErgoTransaction => {
        const targetAddressErgoTree: string = ErgoUtils.addressStringToErgoTreeString(event.toAddress)

        const inBoxes = ErgoBoxes.empty()
        eventBoxes.forEach(box => inBoxes.add(box))

        const rwtTokenId = Configs.ergoRWT
        const watcherBoxes = event.WIDs.map(wid => Utils.hexStringToUint8Array(wid))
            .concat(eventBoxes.slice(1).map(box => InputBoxes.getErgoBoxWID(box)))
            .map(wid => TestData.mockWatcherPermitBox(
                100000n,
                [
                    {
                        tokenId: rwtTokenId,
                        amount: BigInt("1")
                    },
                    {
                        tokenId: "907a31bdadad63e44e5b3a132eb5be218e694270fae6fa55b197ecccac19f87e",
                        amount: BigInt("1")
                    }
                ],
                Contracts.triggerEventErgoTree,
                [
                    {
                        registerId: 4,
                        value: Constant.from_coll_coll_byte([wid])
                    }
                ]
            ))

        const txJsonString: string = TestData.multipleTokenTransferringTokenPaymentTransactionString(
            eventBoxes.map(box => box.box_id().to_str()),
            targetAddressErgoTree,
            watcherBoxes,
            this.bridgeFeeErgoTree,
            this.networkFeeErgoTree,
            this.bankAddressErgoTree
        )
        const tx = UnsignedTransaction.from_json(txJsonString)

        const reducedTx = ReducedTransaction.from_unsigned_tx(tx, inBoxes, ErgoBoxes.empty(), TestData.mockedErgoStateContext)

        const txBytes = reducedTx.sigma_serialize_bytes()
        const txId = tx.id().to_str()
        const eventId = event.sourceTxId
        return new ErgoTransaction(txId, eventId, txBytes, [], [], TransactionTypes.payment)
    }

    /**
     * generates a mocked payment transaction that transfers wrong token
     * @param event token payment event trigger
     * @param eventBoxes event box and valid commitment boxes
     */
    static mockWrongTokenTransferringPaymentTransaction = (event: EventTrigger, eventBoxes: ErgoBox[]): ErgoTransaction => {
        const targetAddressErgoTree: string = ErgoUtils.addressStringToErgoTreeString(event.toAddress)

        const inBoxes = ErgoBoxes.empty()
        eventBoxes.forEach(box => inBoxes.add(box))

        const rwtTokenId = Configs.ergoRWT
        const watcherBoxes = event.WIDs.map(wid => Utils.hexStringToUint8Array(wid))
            .concat(eventBoxes.slice(1).map(box => InputBoxes.getErgoBoxWID(box)))
            .map(wid => TestData.mockWatcherPermitBox(
                100000n,
                [
                    {
                        tokenId: rwtTokenId,
                        amount: BigInt("1")
                    },
                    {
                        tokenId: "907a31bdadad63e44e5b3a132eb5be218e694270fae6fa55b197ecccac19f87e",
                        amount: BigInt("1")
                    }
                ],
                Contracts.triggerEventErgoTree,
                [
                    {
                        registerId: 4,
                        value: Constant.from_coll_coll_byte([wid])
                    }
                ]
            ))

        const txJsonString: string = TestData.wrongTokenTransferringTokenPaymentTransactionString(
            eventBoxes.map(box => box.box_id().to_str()),
            targetAddressErgoTree,
            watcherBoxes,
            this.bridgeFeeErgoTree,
            this.networkFeeErgoTree,
            this.bankAddressErgoTree
        )
        const tx = UnsignedTransaction.from_json(txJsonString)

        const reducedTx = ReducedTransaction.from_unsigned_tx(tx, inBoxes, ErgoBoxes.empty(), TestData.mockedErgoStateContext)

        const txBytes = reducedTx.sigma_serialize_bytes()
        const txId = tx.id().to_str()
        const eventId = event.sourceTxId
        return new ErgoTransaction(txId, eventId, txBytes, [], [], TransactionTypes.payment)
    }

    /**
     * generates a mocked reward distribution tx that change a WID in tx generation
     * @param event token reward event trigger
     * @param eventBoxes event box and valid commitment boxes
     */
    static mockTransferToIllegalWIDTokenPaymentTransaction = (event: EventTrigger, eventBoxes: ErgoBox[]): ErgoTransaction => {
        const targetAddressErgoTree: string = ErgoUtils.addressStringToErgoTreeString(event.toAddress)

        const inBoxes = ErgoBoxes.empty()
        eventBoxes.forEach(box => inBoxes.add(box))

        const rwtTokenId = Configs.ergoRWT
        const watcherBoxes = event.WIDs.slice(1).concat([TestUtils.generateRandomId()])
            .map(wid => Utils.hexStringToUint8Array(wid))
            .concat(eventBoxes.slice(1).map(box => InputBoxes.getErgoBoxWID(box)))
            .map(wid => TestData.mockWatcherPermitBox(
                100000n,
                [
                    {
                        tokenId: rwtTokenId,
                        amount: BigInt("1")
                    },
                    {
                        tokenId: "907a31bdadad63e44e5b3a132eb5be218e694270fae6fa55b197ecccac19f87e",
                        amount: BigInt("1")
                    }
                ],
                Contracts.triggerEventErgoTree,
                [
                    {
                        registerId: 4,
                        value: Constant.from_coll_coll_byte([wid])
                    }
                ]
            ))

        const txJsonString: string = TestData.tokenTransferringErgPaymentTransactionString(
            eventBoxes.map(box => box.box_id().to_str()),
            targetAddressErgoTree,
            watcherBoxes,
            this.bridgeFeeErgoTree,
            this.networkFeeErgoTree,
            this.bankAddressErgoTree
        )
        const tx = UnsignedTransaction.from_json(txJsonString)

        const reducedTx = ReducedTransaction.from_unsigned_tx(tx, inBoxes, ErgoBoxes.empty(), TestData.mockedErgoStateContext)

        const txBytes = reducedTx.sigma_serialize_bytes()
        const txId = tx.id().to_str()
        const eventId = event.sourceTxId
        return new ErgoTransaction(txId, eventId, txBytes, [], [], TransactionTypes.payment)
    }

    /**
     * generates a mocked reward distribution tx that miss a valid commitment box in tx generation
     * @param event token reward event trigger
     * @param eventBoxes event box and valid commitment boxes
     */
    static mockMissingValidCommitmentTokenPaymentTransaction = (event: EventTrigger, eventBoxes: ErgoBox[]): ErgoTransaction => {
        const targetAddressErgoTree: string = ErgoUtils.addressStringToErgoTreeString(event.toAddress)

        const inBoxes = ErgoBoxes.empty()
        eventBoxes.forEach(box => inBoxes.add(box))

        const rwtTokenId = Configs.ergoRWT
        const watcherBoxes = event.WIDs.slice(1).concat([TestUtils.generateRandomId()])
            .map(wid => Utils.hexStringToUint8Array(wid))
            .concat(eventBoxes.slice(1).map(box => InputBoxes.getErgoBoxWID(box)))
            .map(wid => TestData.mockWatcherPermitBox(
                100000n,
                [
                    {
                        tokenId: rwtTokenId,
                        amount: BigInt("1")
                    },
                    {
                        tokenId: "907a31bdadad63e44e5b3a132eb5be218e694270fae6fa55b197ecccac19f87e",
                        amount: BigInt("1")
                    }
                ],
                Contracts.triggerEventErgoTree,
                [
                    {
                        registerId: 4,
                        value: Constant.from_coll_coll_byte([wid])
                    }
                ]
            ))

        const txJsonString: string = TestData.tokenTransferringErgPaymentTransactionString(
            eventBoxes.map(box => box.box_id().to_str()),
            targetAddressErgoTree,
            watcherBoxes,
            this.bridgeFeeErgoTree,
            this.networkFeeErgoTree,
            this.bankAddressErgoTree
        )
        const tx = UnsignedTransaction.from_json(txJsonString)

        const reducedTx = ReducedTransaction.from_unsigned_tx(tx, inBoxes, ErgoBoxes.empty(), TestData.mockedErgoStateContext)

        const txBytes = reducedTx.sigma_serialize_bytes()
        const txId = tx.id().to_str()
        const eventId = event.sourceTxId
        return new ErgoTransaction(txId, eventId, txBytes, [], [], TransactionTypes.payment)
    }

    /**
     * generates an input box for arbitrary address
     */
    static mockSingleBox = (value: number, assets: Asset[], addressContract: Contract): ErgoBox => {
        const boxTokens: Tokens = new Tokens()
        assets.forEach(asset =>
            boxTokens.add(new Token(TokenId.from_str(asset.tokenId), TokenAmount.from_i64(ErgoUtils.i64FromBigint(asset.amount))))
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
     * generates an input box with registers for arbitrary address
     */
    static mockErgoBoxWithRegisters = (value: bigint, assets: Asset[], boxContract: Contract, registers: Register[]): ErgoBox => {
        // generate a random wallet
        const secrets = new SecretKeys()
        secrets.add(SecretKey.random_dlog())
        const wallet = Wallet.from_secrets(secrets)
        const address = secrets.get(0).get_address()

        // generate a fake box
        const boxTokens: Tokens = new Tokens()
        assets.forEach(asset =>
            boxTokens.add(new Token(TokenId.from_str(asset.tokenId), TokenAmount.from_i64(ErgoUtils.i64FromBigint(asset.amount))))
        )
        const fakeInBox = new ErgoBox(
            ErgoUtils.boxValueFromBigint(value + 1100000n),
            this.testBlockchainHeight,
            ErgoUtils.addressToContract(address),
            TxId.from_str(TestUtils.generateRandomId()),
            0,
            boxTokens
        )

        // create fake tx
        const inBoxes = new BoxSelection(new ErgoBoxes(fakeInBox), new ErgoBoxAssetsDataList())
        const tx = TxBuilder.new(
            inBoxes,
            new ErgoBoxCandidates(this.mockErgoBoxCandidate(value, assets, boxContract, registers)),
            this.testBlockchainHeight + 10,
            ErgoUtils.boxValueFromBigint(1100000n),
            address,
            this.ergToBoxValue(1)
        ).build()

        // sign fake tx
        const fakeTx = wallet.sign_transaction(TestData.mockedErgoStateContext, tx, new ErgoBoxes(fakeInBox), ErgoBoxes.empty())
        return fakeTx.outputs().get(0)
    }

    /**
     * generates an output box with registers for arbitrary address
     */
    static mockErgoBoxCandidate = (value: bigint, assets: Asset[], boxContract: Contract, registers: Register[]): ErgoBoxCandidate => {
        const inBox = new ErgoBoxCandidateBuilder(
            ErgoUtils.boxValueFromBigint(value),
            boxContract,
            this.testBlockchainHeight
        )
        assets.forEach(asset =>
            inBox.add_token(TokenId.from_str(asset.tokenId), TokenAmount.from_i64(ErgoUtils.i64FromBigint(asset.amount)))
        )
        registers.forEach(register =>
            inBox.set_register_value(register.registerId, register.value)
        )
        const wid = Buffer.from(TestUtils.generateRandomId(), "hex")
        inBox.set_register_value(4, Constant.from_coll_coll_byte([wid]))
        return inBox.build()
    }

    /**
     * generates an input box for ergo bank address
     */
    static mockSingleBankBox = (value: number, assets: Asset[]): ErgoBox => this.mockSingleBox(
        value,
        assets,
        ErgoUtils.addressStringToContract(this.testBankAddress)
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
        const rwtTokenId = Configs.ergoRWT
        const wids = Array(5).fill(0).map(() => Buffer.from(TestUtils.generateRandomId(), "hex"))
        const eventBox: ErgoBox = this.mockErgoBoxWithRegisters(
            500000n,
            [
                {
                    tokenId: rwtTokenId,
                    amount: BigInt("5")
                }
            ],
            Contracts.triggerEventContract,
            [
                {
                    registerId: 4,
                    value: Constant.from_coll_coll_byte(wids)
                }
            ]
        )
        const commitmentBoxes: ErgoBox[] = Array(2).fill(0).map(() => this.mockErgoBoxWithRegisters(
            100000n,
            [
                {
                    tokenId: rwtTokenId,
                    amount: BigInt("1")
                }
            ],
            Contracts.watcherPermitContract,
            [
                {
                    registerId: 4,
                    value: Constant.from_coll_coll_byte([Buffer.from(TestUtils.generateRandomId(), "hex")])
                }
            ]
        ))
        return [eventBox].concat(commitmentBoxes)
    }

    /**
     * generates a mocked reward distribution tx that distribute token
     * @param event token reward event trigger
     * @param eventBoxes event box and valid commitment boxes
     */
    static mockTokenTransferringErgDistributionTransaction = (event: EventTrigger, eventBoxes: ErgoBox[]): ErgoTransaction => {
        const inBoxes = ErgoBoxes.empty()
        eventBoxes.forEach(box => inBoxes.add(box))

        const rwtTokenId = Configs.ergoRWT
        const watcherBoxes = event.WIDs.map(wid => Utils.hexStringToUint8Array(wid))
            .concat(eventBoxes.slice(1).map(box => InputBoxes.getErgoBoxWID(box)))
            .map(wid => TestData.mockWatcherPermitBox(
            100000n,
            [
                {
                    tokenId: rwtTokenId,
                    amount: BigInt("1")
                },
                {
                    tokenId: "907a31bdadad63e44e5b3a132eb5be218e694270fae6fa55b197ecccac19f87e",
                    amount: BigInt("1")
                }
            ],
            Contracts.triggerEventErgoTree,
            [
                {
                    registerId: 4,
                    value: Constant.from_coll_coll_byte([wid])
                }
            ]
        ))

        const txJsonString: string = TestData.tokenTransferringErgRewardDistributionTxString(
            eventBoxes.map(box => box.box_id().to_str()),
            watcherBoxes,
            this.bridgeFeeErgoTree,
            this.networkFeeErgoTree,
            this.bankAddressErgoTree
        )
        const tx = UnsignedTransaction.from_json(txJsonString)

        const reducedTx = ReducedTransaction.from_unsigned_tx(tx, inBoxes, ErgoBoxes.empty(), TestData.mockedErgoStateContext)

        const txBytes = reducedTx.sigma_serialize_bytes()
        const txId = tx.id().to_str()
        const eventId = event.sourceTxId
        return new ErgoTransaction(txId, eventId, txBytes, [], [], TransactionTypes.reward)
    }

    /**
     * generates a mocked reward distribution tx that change a WID in tx generation
     * @param event token reward event trigger
     * @param eventBoxes event box and valid commitment boxes
     */
    static mockTransferToIllegalWIDDistributionTransaction = (event: EventTrigger, eventBoxes: ErgoBox[]): ErgoTransaction => {
        const inBoxes = ErgoBoxes.empty()
        eventBoxes.forEach(box => inBoxes.add(box))

        const rwtTokenId = Configs.ergoRWT
        const watcherBoxes = event.WIDs.slice(1).concat([TestUtils.generateRandomId()])
            .map(wid => Utils.hexStringToUint8Array(wid))
            .concat(eventBoxes.slice(1).map(box => InputBoxes.getErgoBoxWID(box)))
            .map(wid => TestData.mockWatcherPermitBox(
                100000n,
                [
                    {
                        tokenId: rwtTokenId,
                        amount: BigInt("1")
                    },
                    {
                        tokenId: "907a31bdadad63e44e5b3a132eb5be218e694270fae6fa55b197ecccac19f87e",
                        amount: BigInt("1")
                    }
                ],
                Contracts.triggerEventErgoTree,
                [
                    {
                        registerId: 4,
                        value: Constant.from_coll_coll_byte([wid])
                    }
                ]
            ))

        const txJsonString: string = TestData.tokenRewardDistributionTxString(
            eventBoxes.map(box => box.box_id().to_str()),
            watcherBoxes,
            this.bridgeFeeErgoTree,
            this.networkFeeErgoTree,
            this.bankAddressErgoTree
        )
        const tx = UnsignedTransaction.from_json(txJsonString)

        const reducedTx = ReducedTransaction.from_unsigned_tx(tx, inBoxes, ErgoBoxes.empty(), TestData.mockedErgoStateContext)

        const txBytes = reducedTx.sigma_serialize_bytes()
        const txId = tx.id().to_str()
        const eventId = event.sourceTxId
        return new ErgoTransaction(txId, eventId, txBytes, [], [], TransactionTypes.reward)
    }

    /**
     * generates a mocked reward distribution tx that miss a valid commitment box in tx generation
     * @param event token reward event trigger
     * @param eventBoxes event box and valid commitment boxes
     */
    static mockMissingValidCommitmentDistributionTransaction = (event: EventTrigger, eventBoxes: ErgoBox[]): ErgoTransaction => {
        const inBoxes = ErgoBoxes.empty()
        eventBoxes.forEach(box => inBoxes.add(box))

        const rwtTokenId = Configs.ergoRWT
        const watcherBoxes = event.WIDs.slice(1).concat([TestUtils.generateRandomId()])
            .map(wid => Utils.hexStringToUint8Array(wid))
            .concat(eventBoxes.slice(1).map(box => InputBoxes.getErgoBoxWID(box)))
            .map(wid => TestData.mockWatcherPermitBox(
                100000n,
                [
                    {
                        tokenId: rwtTokenId,
                        amount: BigInt("1")
                    },
                    {
                        tokenId: "907a31bdadad63e44e5b3a132eb5be218e694270fae6fa55b197ecccac19f87e",
                        amount: BigInt("1")
                    }
                ],
                Contracts.triggerEventErgoTree,
                [
                    {
                        registerId: 4,
                        value: Constant.from_coll_coll_byte([wid])
                    }
                ]
            ))

        const txJsonString: string = TestData.tokenRewardDistributionTxString(
            eventBoxes.map(box => box.box_id().to_str()),
            watcherBoxes,
            this.bridgeFeeErgoTree,
            this.networkFeeErgoTree,
            this.bankAddressErgoTree
        )
        const tx = UnsignedTransaction.from_json(txJsonString)

        const reducedTx = ReducedTransaction.from_unsigned_tx(tx, inBoxes, ErgoBoxes.empty(), TestData.mockedErgoStateContext)

        const txBytes = reducedTx.sigma_serialize_bytes()
        const txId = tx.id().to_str()
        const eventId = event.sourceTxId
        return new ErgoTransaction(txId, eventId, txBytes, [], [], TransactionTypes.reward)
    }

    /**
     * generates a mocked reward distribution tx with wrong ergoTree for the change box
     * @param event token reward event trigger
     * @param eventBoxes event box and valid commitment boxes
     */
    static mockIllegalChangeBoxDistributionTransaction = (event: EventTrigger, eventBoxes: ErgoBox[]): ErgoTransaction => {
        const inBoxes = ErgoBoxes.empty()
        eventBoxes.forEach(box => inBoxes.add(box))

        const rwtTokenId = Configs.ergoRWT
        const watcherBoxes = event.WIDs.slice(1).concat([TestUtils.generateRandomId()])
            .map(wid => Utils.hexStringToUint8Array(wid))
            .concat(eventBoxes.slice(1).map(box => InputBoxes.getErgoBoxWID(box)))
            .map(wid => TestData.mockWatcherPermitBox(
                100000n,
                [
                    {
                        tokenId: rwtTokenId,
                        amount: BigInt("1")
                    },
                    {
                        tokenId: "907a31bdadad63e44e5b3a132eb5be218e694270fae6fa55b197ecccac19f87e",
                        amount: BigInt("1")
                    }
                ],
                Contracts.triggerEventErgoTree,
                [
                    {
                        registerId: 4,
                        value: Constant.from_coll_coll_byte([wid])
                    }
                ]
            ))

        const txJsonString: string = TestData.tokenRewardDistributionTxString(
            eventBoxes.map(box => box.box_id().to_str()),
            watcherBoxes,
            this.bridgeFeeErgoTree,
            this.networkFeeErgoTree,
            this.bankAddressErgoTree
        )
        const tx = UnsignedTransaction.from_json(txJsonString)

        const reducedTx = ReducedTransaction.from_unsigned_tx(tx, inBoxes, ErgoBoxes.empty(), TestData.mockedErgoStateContext)

        const txBytes = reducedTx.sigma_serialize_bytes()
        const txId = tx.id().to_str()
        const eventId = event.sourceTxId
        return new ErgoTransaction(txId, eventId, txBytes, [], [], TransactionTypes.reward)
    }

    /**
     * generates a mocked reward distribution tx that transferring wront token
     * @param event token reward event trigger
     * @param eventBoxes event box and valid commitment boxes
     */
    static mockWrongTokenDistributionTransaction = (event: EventTrigger, eventBoxes: ErgoBox[]): ErgoTransaction => {
        const inBoxes = ErgoBoxes.empty()
        eventBoxes.forEach(box => inBoxes.add(box))

        const rwtTokenId = Configs.ergoRWT
        const watcherBoxes = event.WIDs
            .map(wid => Utils.hexStringToUint8Array(wid))
            .concat(eventBoxes.slice(1).map(box => InputBoxes.getErgoBoxWID(box)))
            .map(wid => TestData.mockWatcherPermitBox(
                100000n,
                [
                    {
                        tokenId: rwtTokenId,
                        amount: BigInt("1")
                    },
                    {
                        tokenId: "e2b7b6ab2a7c6dfc6a82cc648f3b16b76db1cf19e93b7ac35a4898c06e4d08ce",
                        amount: BigInt("1")
                    }
                ],
                Contracts.triggerEventErgoTree,
                [
                    {
                        registerId: 4,
                        value: Constant.from_coll_coll_byte([wid])
                    }
                ]
            ))

        const txJsonString: string = TestData.wrongTokenRewardDistributionTxString(
            eventBoxes.map(box => box.box_id().to_str()),
            watcherBoxes,
            this.bridgeFeeErgoTree,
            this.networkFeeErgoTree,
            this.bankAddressErgoTree
        )
        const tx = UnsignedTransaction.from_json(txJsonString)

        const reducedTx = ReducedTransaction.from_unsigned_tx(tx, inBoxes, ErgoBoxes.empty(), TestData.mockedErgoStateContext)

        const txBytes = reducedTx.sigma_serialize_bytes()
        const txId = tx.id().to_str()
        const eventId = event.sourceTxId
        return new ErgoTransaction(txId, eventId, txBytes, [], [], TransactionTypes.reward)
    }

    /**
     * generates a mocked reward distribution tx that transferring wrong amount of token
     * @param event token reward event trigger
     * @param eventBoxes event box and valid commitment boxes
     */
    static mockWrongAmountTokenDistributionTransaction = (event: EventTrigger, eventBoxes: ErgoBox[]): ErgoTransaction => {
        const inBoxes = ErgoBoxes.empty()
        eventBoxes.forEach(box => inBoxes.add(box))

        const rwtTokenId = Configs.ergoRWT
        const watcherBoxes = event.WIDs
            .map(wid => Utils.hexStringToUint8Array(wid))
            .concat(eventBoxes.slice(1).map(box => InputBoxes.getErgoBoxWID(box)))
            .map(wid => TestData.mockWatcherPermitBox(
                100000n,
                [
                    {
                        tokenId: rwtTokenId,
                        amount: BigInt("1")
                    },
                    {
                        tokenId: "907a31bdadad63e44e5b3a132eb5be218e694270fae6fa55b197ecccac19f87e",
                        amount: BigInt("2")
                    }
                ],
                Contracts.triggerEventErgoTree,
                [
                    {
                        registerId: 4,
                        value: Constant.from_coll_coll_byte([wid])
                    }
                ]
            ))

        const txJsonString: string = TestData.wrongTokenAmountRewardDistributionTxString(
            eventBoxes.map(box => box.box_id().to_str()),
            watcherBoxes,
            this.bridgeFeeErgoTree,
            this.networkFeeErgoTree,
            this.bankAddressErgoTree
        )
        const tx = UnsignedTransaction.from_json(txJsonString)

        const reducedTx = ReducedTransaction.from_unsigned_tx(tx, inBoxes, ErgoBoxes.empty(), TestData.mockedErgoStateContext)

        const txBytes = reducedTx.sigma_serialize_bytes()
        const txId = tx.id().to_str()
        const eventId = event.sourceTxId
        return new ErgoTransaction(txId, eventId, txBytes, [], [], TransactionTypes.reward)
    }

    /**
     * generates a mocked token payment tx that burns some token
     * @param event token reward event trigger
     * @param eventBoxes event box and valid commitment boxes
     */
    static mockTokenBurningTokenPaymentTransaction = (event: EventTrigger, eventBoxes: ErgoBox[]): ErgoTransaction => {
        const targetAddressErgoTree: string = ErgoUtils.addressStringToErgoTreeString(event.toAddress)
        const paymentTxInputBoxes: Uint8Array[] = []
        const txInputBoxes: string[] = []

        const inBoxes = ErgoBoxes.empty()
        eventBoxes.forEach(box => {
            inBoxes.add(box)
            paymentTxInputBoxes.push(box.sigma_serialize_bytes())
            txInputBoxes.push(box.box_id().to_str())
        })
        const bankBoxes = this.mockBankBoxes()
        bankBoxes.boxes.forEach(box => {
            inBoxes.add(box)
            paymentTxInputBoxes.push(box.sigma_serialize_bytes())
            txInputBoxes.push(box.box_id().to_str())
        })

        const rwtTokenId = Configs.ergoRWT
        const watcherBoxes = event.WIDs
            .map(wid => Utils.hexStringToUint8Array(wid))
            .concat(eventBoxes.slice(1).map(box => InputBoxes.getErgoBoxWID(box)))
            .map(wid => TestData.mockWatcherPermitBox(
                100000n,
                [
                    {
                        tokenId: rwtTokenId,
                        amount: BigInt("1")
                    },
                    {
                        tokenId: "907a31bdadad63e44e5b3a132eb5be218e694270fae6fa55b197ecccac19f87e",
                        amount: BigInt("1")
                    }
                ],
                Contracts.triggerEventErgoTree,
                [
                    {
                        registerId: 4,
                        value: Constant.from_coll_coll_byte([wid])
                    }
                ]
            ))

        const txJsonString: string = TestData.tokenPaymentTransactionString(
            txInputBoxes,
            targetAddressErgoTree,
            watcherBoxes,
            this.bridgeFeeErgoTree,
            this.networkFeeErgoTree,
            this.bankAddressErgoTree,
            bankBoxes.boxes[0].tokens().get(1).id().to_str()
        )
        const tx = UnsignedTransaction.from_json(txJsonString)

        const reducedTx = ReducedTransaction.from_unsigned_tx(tx, inBoxes, ErgoBoxes.empty(), TestData.mockedErgoStateContext)

        const txBytes = reducedTx.sigma_serialize_bytes()
        const txId = tx.id().to_str()
        const eventId = event.sourceTxId
        return new ErgoTransaction(txId, eventId, txBytes, paymentTxInputBoxes, [], TransactionTypes.payment)
    }

    /**
     * generates a mocked erg payment tx that burns some token
     * @param event token reward event trigger
     * @param eventBoxes event box and valid commitment boxes
     */
    static mockTokenBurningErgPaymentTransaction = (event: EventTrigger, eventBoxes: ErgoBox[]): ErgoTransaction => {
        const targetAddressErgoTree: string = ErgoUtils.addressStringToErgoTreeString(event.toAddress)
        const paymentTxInputBoxes: Uint8Array[] = []
        const txInputBoxes: string[] = []

        const inBoxes = ErgoBoxes.empty()
        eventBoxes.forEach(box => {
            inBoxes.add(box)
            paymentTxInputBoxes.push(box.sigma_serialize_bytes())
            txInputBoxes.push(box.box_id().to_str())
        })
        const bankBoxes = this.mockBankBoxes()
        bankBoxes.boxes.forEach(box => {
            inBoxes.add(box)
            paymentTxInputBoxes.push(box.sigma_serialize_bytes())
            txInputBoxes.push(box.box_id().to_str())
        })

        const rwtTokenId = Configs.ergoRWT
        const watcherBoxes = event.WIDs
            .map(wid => Utils.hexStringToUint8Array(wid))
            .concat(eventBoxes.slice(1).map(box => InputBoxes.getErgoBoxWID(box)))
            .map(wid => TestData.mockWatcherPermitBox(
                71528571n,
                [
                    {
                        tokenId: rwtTokenId,
                        amount: BigInt("1")
                    }
                ],
                Contracts.triggerEventErgoTree,
                [
                    {
                        registerId: 4,
                        value: Constant.from_coll_coll_byte([wid])
                    }
                ]
            ))

        const txJsonString: string = TestData.ergPaymentTransactionString(
            txInputBoxes,
            targetAddressErgoTree,
            watcherBoxes,
            this.bridgeFeeErgoTree,
            this.networkFeeErgoTree,
            this.bankAddressErgoTree,
            bankBoxes.boxes[0].tokens().get(1).id().to_str()
        )
        const tx = UnsignedTransaction.from_json(txJsonString)

        const reducedTx = ReducedTransaction.from_unsigned_tx(tx, inBoxes, ErgoBoxes.empty(), TestData.mockedErgoStateContext)

        const txBytes = reducedTx.sigma_serialize_bytes()
        const txId = tx.id().to_str()
        const eventId = event.sourceTxId
        return new ErgoTransaction(txId, eventId, txBytes, paymentTxInputBoxes, [], TransactionTypes.payment)
    }

    /**
     * generates a mocked token reward distribution tx that burns some token
     * @param event token reward event trigger
     * @param eventBoxes event box and valid commitment boxes
     */
    static mockTokenBurningTokenDistributionTransaction = (event: EventTrigger, eventBoxes: ErgoBox[]): ErgoTransaction => {
        const rewardTxInputBoxes: Uint8Array[] = []
        const txInputBoxes: string[] = []

        const inBoxes = ErgoBoxes.empty()
        eventBoxes.forEach(box => {
            inBoxes.add(box)
            rewardTxInputBoxes.push(box.sigma_serialize_bytes())
            txInputBoxes.push(box.box_id().to_str())
        })
        const bankBoxes = this.mockBankBoxes()
        bankBoxes.boxes.forEach(box => {
            inBoxes.add(box)
            rewardTxInputBoxes.push(box.sigma_serialize_bytes())
            txInputBoxes.push(box.box_id().to_str())
        })

        const rwtTokenId = Configs.ergoRWT
        const watcherBoxes = event.WIDs
            .map(wid => Utils.hexStringToUint8Array(wid))
            .concat(eventBoxes.slice(1).map(box => InputBoxes.getErgoBoxWID(box)))
            .map(wid => TestData.mockWatcherPermitBox(
                100000n,
                [
                    {
                        tokenId: rwtTokenId,
                        amount: BigInt("1")
                    },
                    {
                        tokenId: "907a31bdadad63e44e5b3a132eb5be218e694270fae6fa55b197ecccac19f87e",
                        amount: BigInt("1")
                    }
                ],
                Contracts.triggerEventErgoTree,
                [
                    {
                        registerId: 4,
                        value: Constant.from_coll_coll_byte([wid])
                    }
                ]
            ))

        const txJsonString: string = TestData.tokenDistributionTxString(
            txInputBoxes,
            watcherBoxes,
            this.bridgeFeeErgoTree,
            this.networkFeeErgoTree,
            this.bankAddressErgoTree,
            bankBoxes.boxes[0].tokens().get(1).id().to_str()
        )
        const tx = UnsignedTransaction.from_json(txJsonString)

        const reducedTx = ReducedTransaction.from_unsigned_tx(tx, inBoxes, ErgoBoxes.empty(), TestData.mockedErgoStateContext)

        const txBytes = reducedTx.sigma_serialize_bytes()
        const txId = tx.id().to_str()
        const eventId = event.sourceTxId
        return new ErgoTransaction(txId, eventId, txBytes, rewardTxInputBoxes, [], TransactionTypes.reward)
    }

    /**
     * generates a mocked erg reward distribution tx that burns some token
     * @param event token reward event trigger
     * @param eventBoxes event box and valid commitment boxes
     */
    static mockTokenBurningErgDistributionTransaction = (event: EventTrigger, eventBoxes: ErgoBox[]): ErgoTransaction => {
        const rewardTxInputBoxes: Uint8Array[] = []
        const txInputBoxes: string[] = []

        const inBoxes = ErgoBoxes.empty()
        eventBoxes.forEach(box => {
            inBoxes.add(box)
            rewardTxInputBoxes.push(box.sigma_serialize_bytes())
            txInputBoxes.push(box.box_id().to_str())
        })
        const bankBoxes = this.mockBankBoxes()
        bankBoxes.boxes.forEach(box => {
            inBoxes.add(box)
            rewardTxInputBoxes.push(box.sigma_serialize_bytes())
            txInputBoxes.push(box.box_id().to_str())
        })

        const rwtTokenId = Configs.ergoRWT
        const watcherBoxes = event.WIDs
            .map(wid => Utils.hexStringToUint8Array(wid))
            .concat(eventBoxes.slice(1).map(box => InputBoxes.getErgoBoxWID(box)))
            .map(wid => TestData.mockWatcherPermitBox(
                71528571n,
                [
                    {
                        tokenId: rwtTokenId,
                        amount: BigInt("1")
                    }
                ],
                Contracts.triggerEventErgoTree,
                [
                    {
                        registerId: 4,
                        value: Constant.from_coll_coll_byte([wid])
                    }
                ]
            ))

        const txJsonString: string = TestData.ergDistributionTxString(
            txInputBoxes,
            watcherBoxes,
            this.bridgeFeeErgoTree,
            this.networkFeeErgoTree,
            this.bankAddressErgoTree,
            bankBoxes.boxes[0].tokens().get(1).id().to_str()
        )
        const tx = UnsignedTransaction.from_json(txJsonString)

        const reducedTx = ReducedTransaction.from_unsigned_tx(tx, inBoxes, ErgoBoxes.empty(), TestData.mockedErgoStateContext)

        const txBytes = reducedTx.sigma_serialize_bytes()
        const txId = tx.id().to_str()
        const eventId = event.sourceTxId
        return new ErgoTransaction(txId, eventId, txBytes, rewardTxInputBoxes, [], TransactionTypes.reward)
    }

    /**
     * generates a mocked reward distribution tx that distributes only RSN with wrong amount
     * @param event token reward event trigger
     * @param eventBoxes event box and valid commitment boxes
     */
    static mockWrongAmountRSNOnlyDistributionTransaction = (event: EventTrigger, eventBoxes: ErgoBox[]): ErgoTransaction => {
        const rewardTxInputBoxes: Uint8Array[] = []
        const rsnTokenId = Configs.rsn
        const txInputBoxes: string[] = []

        const inBoxes = ErgoBoxes.empty()
        eventBoxes.forEach(box => {
            inBoxes.add(box)
            rewardTxInputBoxes.push(box.sigma_serialize_bytes())
            txInputBoxes.push(box.box_id().to_str())
        })
        const bankBoxes = this.mockBankBoxes()
        bankBoxes.boxes.forEach(box => {
            inBoxes.add(box)
            rewardTxInputBoxes.push(box.sigma_serialize_bytes())
            txInputBoxes.push(box.box_id().to_str())
        })

        const rwtTokenId = Configs.ergoRWT
        const watcherBoxes = event.WIDs
            .map(wid => Utils.hexStringToUint8Array(wid))
            .concat(eventBoxes.slice(1).map(box => InputBoxes.getErgoBoxWID(box)))
            .map(wid => TestData.mockWatcherPermitBox(
                100000n,
                [
                    {
                        tokenId: rwtTokenId,
                        amount: BigInt("1")
                    },
                    {
                        tokenId: rsnTokenId,
                        amount: BigInt("26857")
                    }
                ],
                Contracts.triggerEventErgoTree,
                [
                    {
                        registerId: 4,
                        value: Constant.from_coll_coll_byte([wid])
                    }
                ]
            ))

        const txJsonString: string = TestData.mockWrongAmountRSNOnlyRewardTx(
            txInputBoxes,
            watcherBoxes,
            this.bridgeFeeErgoTree,
            this.networkFeeErgoTree,
            this.bankAddressErgoTree,
            bankBoxes.boxes[0].tokens().get(1).id().to_str(),
            rsnTokenId
        )
        const tx = UnsignedTransaction.from_json(txJsonString)

        const reducedTx = ReducedTransaction.from_unsigned_tx(tx, inBoxes, ErgoBoxes.empty(), TestData.mockedErgoStateContext)

        const txBytes = reducedTx.sigma_serialize_bytes()
        const txId = tx.id().to_str()
        const eventId = event.sourceTxId
        return new ErgoTransaction(txId, eventId, txBytes, rewardTxInputBoxes, [], TransactionTypes.reward)
    }

    /**
     * generates a mocked payment transaction that transfers only RSN with wrong amount
     * @param event token reward event trigger
     * @param eventBoxes event box and valid commitment boxes
     */
    static mockWrongAmountRSNOnlyPaymentTransaction = (event: EventTrigger, eventBoxes: ErgoBox[]): ErgoTransaction => {
        const paymentTxInputBoxes: Uint8Array[] = []
        const targetAddressErgoTree: string = ErgoUtils.addressStringToErgoTreeString(event.toAddress)
        const rsnTokenId = Configs.rsn

        const txInputBoxes: string[] = []

        const inBoxes = ErgoBoxes.empty()
        eventBoxes.forEach(box => {
            inBoxes.add(box)
            paymentTxInputBoxes.push(box.sigma_serialize_bytes())
            txInputBoxes.push(box.box_id().to_str())
        })
        const bankBoxes = this.mockBankBoxes()
        bankBoxes.boxes.forEach(box => {
            inBoxes.add(box)
            paymentTxInputBoxes.push(box.sigma_serialize_bytes())
            txInputBoxes.push(box.box_id().to_str())
        })

        const rwtTokenId = Configs.ergoRWT
        const watcherBoxes = event.WIDs
            .map(wid => Utils.hexStringToUint8Array(wid))
            .concat(eventBoxes.slice(1).map(box => InputBoxes.getErgoBoxWID(box)))
            .map(wid => TestData.mockWatcherPermitBox(
                100000n,
                [
                    {
                        tokenId: rwtTokenId,
                        amount: BigInt("1")
                    },
                    {
                        tokenId: "db6df45d3ed738ff4ff48d3cdf50ba0e5c3018bc088430a33e700073d2390ba4",
                        amount: BigInt("26857")
                    }
                ],
                Contracts.triggerEventErgoTree,
                [
                    {
                        registerId: 4,
                        value: Constant.from_coll_coll_byte([wid])
                    }
                ]
            ))

        const txJsonString: string = TestData.mockWrongAmountRSNOnlyPaymentTx(
            txInputBoxes,
            targetAddressErgoTree,
            watcherBoxes,
            this.bridgeFeeErgoTree,
            this.networkFeeErgoTree,
            this.bankAddressErgoTree,
            bankBoxes.boxes[0].tokens().get(1).id().to_str(),
            rsnTokenId
        )
        const tx = UnsignedTransaction.from_json(txJsonString)

        const reducedTx = ReducedTransaction.from_unsigned_tx(tx, inBoxes, ErgoBoxes.empty(), TestData.mockedErgoStateContext)

        const txBytes = reducedTx.sigma_serialize_bytes()
        const txId = tx.id().to_str()
        const eventId = event.sourceTxId
        return new ErgoTransaction(txId, eventId, txBytes, paymentTxInputBoxes, [], TransactionTypes.payment)
    }

    static guardNFTBox = ErgoBox.from_json(`{
        "boxId": "36cd39ea0c9f690f8f59fc0777e1039abdc614f7605c7d9631f1155275f006b1",
        "transactionId": "9a3fc65b7ad85254c101f873478a750f0b2b0328ef72889179652568f7c06004",
        "blockId": "12f27a7cec3314256d7a988f0c8cede17dd92421610d95fc630d9427e23608aa",
        "value": 75713805000000000,
        "index": 0,
        "globalIndex": 565519,
        "creationHeight": 262153,
        "settlementHeight": 262153,
        "ergoTree": "101004020e351002040208cd0279be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798ea02d192a39a8cc7a7017300730110010204020404040004c0fd4f05808c82f5f6030580b8c9e5ae040580f882ad16040204c0944004c0f407040004000580f882ad16d19683030191a38cc7a7019683020193c2b2a57300007473017302830108cdeeac93a38cc7b2a573030001978302019683040193b1a5730493c2a7c2b2a573050093958fa3730673079973089c73097e9a730a9d99a3730b730c0599c1a7c1b2a5730d00938cc7b2a5730e0001a390c1a7730f",
        "address": "MQTYtUqXyCGzHXmegwaJaqt8vb4yTRTRu8f3gNN35cogdrrkH8vSi5utw7iMuwRRDcZ8ge9wneTAsiXkVquYgk2SFpS5At38XmaE9yMEXcQGoXcvq6DWqgRQQeT1YS9Yxp3dh9AAvmdnXnNa2tN2n9q4t4N2V1TPYwD2eZWxD3RWBJqgDF8z8obSAkotcSY2873S6uRZGqA8q1Upe8HdmebRzuJLWSW9kEDm2vDbyiS81sJ9T8xErxqbsny2qCQKCYm5SiH8A6keDuBuZHwQ1B6w35Lzy3TwPH5hgasnrBeWuMJ6AhaQPtJU3TyW",
        "assets": [],
        "additionalRegisters": {},
        "spentTransactionId": "158642ac22fef3ee08b40b6f78c39564d3c2fb22bf8393ef6083c37225fdf4d8",
        "mainChain": true
    }`)

}

export default TestBoxes
