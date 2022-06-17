import { EventTrigger, PaymentTransaction } from "../../../../src/models/Models";
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
import Utils from "../../../../src/chains/ergo/helpers/Utils";
import TestData from "./TestData";
import { JsonBI } from "../../../../src/network/NetworkModels";
import TestConfigs from "../../../testUtils/TestConfigs";
import ErgoConfigs from "../../../../src/chains/ergo/helpers/ErgoConfigs";
import Contracts from "../../../../src/contracts/Contracts";
import Configs from "../../../../src/helpers/Configs";
import RewardBoxes from "../../../../src/chains/ergo/helpers/RewardBoxes";

class TestBoxes {

    static testBankAddress = ErgoConfigs.bankAddress
    static testBlockchainHeight = TestConfigs.ergo.blockchainHeight
    static bridgeFeeErgoTree: string = Utils.addressStringToErgoTreeString(ErgoConfigs.bridgeFeeRepoAddress)
    static networkFeeErgoTree: string = Utils.addressStringToErgoTreeString(ErgoConfigs.networkFeeRepoAddress)
    static bankAddressErgoTree: string = Utils.addressStringToErgoTreeString(this.testBankAddress)

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
            "90", "20", "5", "",
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
        const randomTokenId: string = TestUtils.generateRandomId()

        const box1Tokens: Tokens = new Tokens()
        box1Tokens.add(new Token(TokenId.from_str(targetTokenId), TokenAmount.from_i64(I64.from_str("54"))))
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
        box2Tokens.add(new Token(TokenId.from_str(targetTokenId), TokenAmount.from_i64(I64.from_str("45"))))
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
     * @param eventBoxes event box and valid commitment boxes
     */
    static mockTokenTransferringPaymentTransaction = (event: EventTrigger, eventBoxes: ErgoBox[]): PaymentTransaction => {
        const targetAddressErgoTree: string = Utils.addressStringToErgoTreeString(event.toAddress)

        const inBoxes = ErgoBoxes.empty()
        eventBoxes.forEach(box => inBoxes.add(box))

        const rwtTokenId = Configs.ergoRWT
        const watcherBoxes = event.WIDs.map(wid => Utils.hexStringToUint8Array(wid))
            .concat(eventBoxes.slice(1).map(box => RewardBoxes.getErgoBoxWID(box)))
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
        return new PaymentTransaction(txId, eventId, txBytes)
    }

    /**
     * generates a mocked payment transaction that only transfers erg
     * @param event erg payment event trigger
     * @param eventBoxes event box and valid commitment boxes
     */
    static mockErgTransferringPaymentTransaction = (event: EventTrigger, eventBoxes: ErgoBox[]): PaymentTransaction => {
        const targetAddressErgoTree: string = Utils.addressStringToErgoTreeString(event.toAddress)

        const inBoxes = ErgoBoxes.empty()
        eventBoxes.forEach(box => inBoxes.add(box))

        const rwtTokenId = Configs.ergoRWT
        const watcherBoxes = event.WIDs.map(wid => Utils.hexStringToUint8Array(wid))
            .concat(eventBoxes.slice(1).map(box => RewardBoxes.getErgoBoxWID(box)))
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
        return new PaymentTransaction(txId, eventId, txBytes)
    }

    /**
     * generates a mocked payment transaction that transfers two tokens
     * @param event token payment event trigger
     * @param eventBoxes event box and valid commitment boxes
     */
    static mockMultipleTokensTransferringPaymentTransaction = (event: EventTrigger, eventBoxes: ErgoBox[]): PaymentTransaction => {
        const targetAddressErgoTree: string = Utils.addressStringToErgoTreeString(event.toAddress)

        const inBoxes = ErgoBoxes.empty()
        eventBoxes.forEach(box => inBoxes.add(box))

        const rwtTokenId = Configs.ergoRWT
        const watcherBoxes = event.WIDs.map(wid => Utils.hexStringToUint8Array(wid))
            .concat(eventBoxes.slice(1).map(box => RewardBoxes.getErgoBoxWID(box)))
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
        return new PaymentTransaction(txId, eventId, txBytes)
    }

    /**
     * generates a mocked payment transaction that transfers wrong token
     * @param event token payment event trigger
     * @param eventBoxes event box and valid commitment boxes
     */
    static mockWrongTokenTransferringPaymentTransaction = (event: EventTrigger, eventBoxes: ErgoBox[]): PaymentTransaction => {
        const targetAddressErgoTree: string = Utils.addressStringToErgoTreeString(event.toAddress)

        const inBoxes = ErgoBoxes.empty()
        eventBoxes.forEach(box => inBoxes.add(box))

        const rwtTokenId = Configs.ergoRWT
        const watcherBoxes = event.WIDs.map(wid => Utils.hexStringToUint8Array(wid))
            .concat(eventBoxes.slice(1).map(box => RewardBoxes.getErgoBoxWID(box)))
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
        return new PaymentTransaction(txId, eventId, txBytes)
    }

    /**
     * generates a mocked reward distribution tx that change a WID in tx generation
     * @param event token reward event trigger
     * @param eventBoxes event box and valid commitment boxes
     */
    static mockTransferToIllegalWIDTokenPaymentTransaction = (event: EventTrigger, eventBoxes: ErgoBox[]): PaymentTransaction => {
        const targetAddressErgoTree: string = Utils.addressStringToErgoTreeString(event.toAddress)

        const inBoxes = ErgoBoxes.empty()
        eventBoxes.forEach(box => inBoxes.add(box))

        const rwtTokenId = Configs.ergoRWT
        const watcherBoxes = event.WIDs.slice(1).concat([TestUtils.generateRandomId()])
            .map(wid => Utils.hexStringToUint8Array(wid))
            .concat(eventBoxes.slice(1).map(box => RewardBoxes.getErgoBoxWID(box)))
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
        return new PaymentTransaction(txId, eventId, txBytes)
    }

    /**
     * generates a mocked reward distribution tx that miss a valid commitment box in tx generation
     * @param event token reward event trigger
     * @param eventBoxes event box and valid commitment boxes
     */
    static mockMissingValidCommitmentTokenPaymentTransaction = (event: EventTrigger, eventBoxes: ErgoBox[]): PaymentTransaction => {
        const targetAddressErgoTree: string = Utils.addressStringToErgoTreeString(event.toAddress)

        const inBoxes = ErgoBoxes.empty()
        eventBoxes.forEach(box => inBoxes.add(box))

        const rwtTokenId = Configs.ergoRWT
        const watcherBoxes = event.WIDs.slice(1).concat([TestUtils.generateRandomId()])
            .map(wid => Utils.hexStringToUint8Array(wid))
            .concat(eventBoxes.slice(1).map(box => RewardBoxes.getErgoBoxWID(box)))
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
            boxTokens.add(new Token(TokenId.from_str(asset.tokenId), TokenAmount.from_i64(Utils.i64FromBigint(asset.amount))))
        )
        const fakeInBox = new ErgoBox(
            Utils.boxValueFromBigint(value + 1100000n),
            this.testBlockchainHeight,
            Utils.addressToContract(address),
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
            Utils.boxValueFromBigint(1100000n),
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
            Utils.boxValueFromBigint(value),
            boxContract,
            this.testBlockchainHeight
        )
        assets.forEach(asset =>
            inBox.add_token(TokenId.from_str(asset.tokenId), TokenAmount.from_i64(Utils.i64FromBigint(asset.amount)))
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
    static mockTokenTransferringErgDistributionTransaction = (event: EventTrigger, eventBoxes: ErgoBox[]): PaymentTransaction => {
        const inBoxes = ErgoBoxes.empty()
        eventBoxes.forEach(box => inBoxes.add(box))

        const rwtTokenId = Configs.ergoRWT
        const watcherBoxes = event.WIDs.map(wid => Utils.hexStringToUint8Array(wid))
            .concat(eventBoxes.slice(1).map(box => RewardBoxes.getErgoBoxWID(box)))
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
        return new PaymentTransaction(txId, eventId, txBytes)
    }

    /**
     * generates a mocked reward distribution tx that change a WID in tx generation
     * @param event token reward event trigger
     * @param eventBoxes event box and valid commitment boxes
     */
    static mockTransferToIllegalWIDDistributionTransaction = (event: EventTrigger, eventBoxes: ErgoBox[]): PaymentTransaction => {
        const inBoxes = ErgoBoxes.empty()
        eventBoxes.forEach(box => inBoxes.add(box))

        const rwtTokenId = Configs.ergoRWT
        const watcherBoxes = event.WIDs.slice(1).concat([TestUtils.generateRandomId()])
            .map(wid => Utils.hexStringToUint8Array(wid))
            .concat(eventBoxes.slice(1).map(box => RewardBoxes.getErgoBoxWID(box)))
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
        return new PaymentTransaction(txId, eventId, txBytes)
    }

    /**
     * generates a mocked reward distribution tx that miss a valid commitment box in tx generation
     * @param event token reward event trigger
     * @param eventBoxes event box and valid commitment boxes
     */
    static mockMissingValidCommitmentDistributionTransaction = (event: EventTrigger, eventBoxes: ErgoBox[]): PaymentTransaction => {
        const inBoxes = ErgoBoxes.empty()
        eventBoxes.forEach(box => inBoxes.add(box))

        const rwtTokenId = Configs.ergoRWT
        const watcherBoxes = event.WIDs.slice(1).concat([TestUtils.generateRandomId()])
            .map(wid => Utils.hexStringToUint8Array(wid))
            .concat(eventBoxes.slice(1).map(box => RewardBoxes.getErgoBoxWID(box)))
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
        return new PaymentTransaction(txId, eventId, txBytes)
    }

    /**
     * generates a mocked reward distribution tx with wrong ergoTree for the change box
     * @param event token reward event trigger
     * @param eventBoxes event box and valid commitment boxes
     */
    static mockIllegalChangeBoxDistributionTransaction = (event: EventTrigger, eventBoxes: ErgoBox[]): PaymentTransaction => {
        const inBoxes = ErgoBoxes.empty()
        eventBoxes.forEach(box => inBoxes.add(box))

        const rwtTokenId = Configs.ergoRWT
        const watcherBoxes = event.WIDs.slice(1).concat([TestUtils.generateRandomId()])
            .map(wid => Utils.hexStringToUint8Array(wid))
            .concat(eventBoxes.slice(1).map(box => RewardBoxes.getErgoBoxWID(box)))
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
        return new PaymentTransaction(txId, eventId, txBytes)
    }

    /**
     * generates a mocked reward distribution tx that transferring wront token
     * @param event token reward event trigger
     * @param eventBoxes event box and valid commitment boxes
     */
    static mockWrongTokenDistributionTransaction = (event: EventTrigger, eventBoxes: ErgoBox[]): PaymentTransaction => {
        const inBoxes = ErgoBoxes.empty()
        eventBoxes.forEach(box => inBoxes.add(box))

        const rwtTokenId = Configs.ergoRWT
        const watcherBoxes = event.WIDs
            .map(wid => Utils.hexStringToUint8Array(wid))
            .concat(eventBoxes.slice(1).map(box => RewardBoxes.getErgoBoxWID(box)))
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
        return new PaymentTransaction(txId, eventId, txBytes)
    }

    /**
     * generates a mocked reward distribution tx that transferring wrong amount of token
     * @param event token reward event trigger
     * @param eventBoxes event box and valid commitment boxes
     */
    static mockWrongAmountTokenDistributionTransaction = (event: EventTrigger, eventBoxes: ErgoBox[]): PaymentTransaction => {
        const inBoxes = ErgoBoxes.empty()
        eventBoxes.forEach(box => inBoxes.add(box))

        const rwtTokenId = Configs.ergoRWT
        const watcherBoxes = event.WIDs
            .map(wid => Utils.hexStringToUint8Array(wid))
            .concat(eventBoxes.slice(1).map(box => RewardBoxes.getErgoBoxWID(box)))
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
        return new PaymentTransaction(txId, eventId, txBytes)
    }

}

export default TestBoxes
