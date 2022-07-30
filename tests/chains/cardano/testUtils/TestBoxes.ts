import { EventTrigger, PaymentTransaction } from "../../../../src/models/Models";
import TestUtils from "../../../testUtils/TestUtils";
import { Utxo } from "../../../../src/chains/cardano/models/Interfaces";
import {
    Address, AssetName, Assets,
    BigNum,
    MultiAsset,
    ScriptHash, Transaction, TransactionBuilder,
    TransactionOutput, TransactionWitnessSet,
    Value
} from "@emurgo/cardano-serialization-lib-nodejs";
import CardanoConfigs from "../../../../src/chains/cardano/helpers/CardanoConfigs";
import CardanoUtils from "../../../../src/chains/cardano/helpers/CardanoUtils";
import CardanoTransaction from "../../../../src/chains/cardano/models/CardanoTransaction";

class TestBoxes {

    static testBankAddress = CardanoConfigs.bankAddress

    /**
     * returns string representation for arbitrary amount of ADA in lovelace unit
     */
    static adaToLovelaceString = (ada: number): string => (ada * 1000000).toString()

    /**
     * generates a mocked event trigger for ADA payment in cardano chain
     */
    static mockADAPaymentEventTrigger = (): EventTrigger => {
        return new EventTrigger("", "cardano", "",
            "addr_test1qqn3eyyydsztynkk2f3x4hsfz46klqf6xncp2em92mgt3qtvvz7nw9gmznn65g4ksrrfvyzhz52knc3mqxdyya47gz2qppk5jd",
            "51300000", "1000000", "300000", "",
            "lovelace", TestUtils.generateRandomId(), "", []
        )
    }

    /**
     * generates a mocked event trigger for asset payment in cardano chain
     */
    static mockAssetPaymentEventTrigger = (): EventTrigger => {
        return new EventTrigger("", "cardano", "",
            "addr_test1qqn3eyyydsztynkk2f3x4hsfz46klqf6xncp2em92mgt3qtvvz7nw9gmznn65g4ksrrfvyzhz52knc3mqxdyya47gz2qppk5jd",
            "80", "10", "5", "",
            "asset1nl0puwxmhas8fawxp8nx4e2q3wekg969n2auw3", TestUtils.generateRandomId(), "", []
        )
    }

    /**
     * generates a mocked event trigger for event verification in cardano chain
     */
    static mockValidEventTrigger = (): EventTrigger => {
        return new EventTrigger("cardano", "ergo",
            "addr_test1vzg07d2qp3xje0w77f982zkhqey50gjxrsdqh89yx8r7nasu97hr0", "ergoAddress",
            "10", "10000", "10000", "asset1nl0puwxmhas8fawxp8nx4e2q3wekg969n2auw3",
            "0034c44f0c7a38f833190d44125ff9b3a0dd9dbb89138160182a930bc521db95",
            "cf32ad374daefdce563e3391effc4fc42eb0e74bbec8afe16a46eeea69e3b2aa",
            "93395496d590ec6db0f2fd13a7bcf91e82a9f230ef677f6216ea8c9f57df6ab3", []
        )
    }

    /**
     * generates an invalid mocked event trigger for event verification in cardano chain
     */
    static mockInvalidEventTrigger = (): EventTrigger => {
        return new EventTrigger("cardano", "ergo",
            "addr_test1vzg07d2qp3xje0w77f982zkhqey50gjxrsdqh89yx8r7nasu97hr0", "ergoAddress",
            "1", "10000", "10000", "asset1nl0puwxmhas8fawxp8nx4e2q3wekg969n2auw3",
            "0034c44f0c7a38f833190d44125ff9b3a0dd9dbb89138160182a930bc521db95",
            "cf32ad374daefdce563e3391effc4fc42eb0e74bbec8afe16a46eeea69e3b2aa",
            "93395496d590ec6db0f2fd13a7bcf91e82a9f230ef677f6216ea8c9f57df6ab3", []
        )
    }

    /**
     * generates 3 Utxo for cardano bank address
     */
    static mockBankBoxes = (): Utxo[] => {
        const box1: Utxo = {
            payment_addr: { "bech32": ""},
            tx_hash: TestUtils.generateRandomId(),
            tx_index: 0,
            value: this.adaToLovelaceString(30),
            asset_list: [
                {
                    policy_id: "7eae28af2208be856f7a119668ae52a49b73725e326dc16579dcc373",
                    asset_name: "",
                    quantity: "100"
                },
                {
                    policy_id: "7eae28af2208be856f7a119668ae52a49b73725e326dc16579dcc37e",
                    asset_name: "",
                    quantity: "50"
                }
            ]
        }
        const box2: Utxo = {
            payment_addr: { "bech32": ""},
            tx_hash: TestUtils.generateRandomId(),
            tx_index: 0,
            value: this.adaToLovelaceString(100),
            asset_list: [
                {
                    policy_id: "7eae28af2208be856f7a119668ae52a49b73725e326dc16579dcc37e",
                    asset_name: "",
                    quantity: "45"
                }
            ]
        }
        const box3: Utxo = {
            payment_addr: { "bech32": ""},
            tx_hash: TestUtils.generateRandomId(),
            tx_index: 2,
            value: this.adaToLovelaceString(10),
            asset_list: []
        }
        return [box1, box2, box3]
    }

    /**
     * generates a mocked payment transaction with given outBoxes
     * @param outBoxes output Utxos in the transaction
     * @param eventId the event trigger id
     */
    static mockPaymentTransaction = (outBoxes: TransactionOutput[], eventId: string): PaymentTransaction => {
        const txBuilder = TransactionBuilder.new(CardanoConfigs.txBuilderConfig)
        outBoxes.forEach(box => txBuilder.add_output(box))

        // set transaction TTL and Fee
        txBuilder.set_ttl(CardanoConfigs.txTtl)
        txBuilder.set_fee(CardanoConfigs.txFee)

        // create the transaction
        const txBody = txBuilder.build();
        const tx = Transaction.new(
            txBody,
            TransactionWitnessSet.new(),
            undefined, // transaction metadata
        );

        // create PaymentTransaction object
        const txId = TestUtils.generateRandomId()
        const txBytes = tx.to_bytes()
        return new CardanoTransaction(txId, eventId, txBytes)
    }

    /**
     * generates a mocked payment transaction that transfers two assets with same policyId
     * @param event asset payment event trigger
     * @param bankAddress bank address
     */
    static mockAssetTransferringPaymentTransaction = (event: EventTrigger, bankAddress: string): PaymentTransaction => {
        // calculate assets of payment box
        const paymentAmount: BigNum = BigNum.from_str(event.amount)
            .checked_sub(BigNum.from_str(event.bridgeFee))
            .checked_sub(BigNum.from_str(event.networkFee))

        const illegalAssetUnit: Uint8Array = Buffer.from(TestUtils.generateRandomId(), "hex")
        const illegalAssetPolicyId: ScriptHash = ScriptHash.from_bytes(illegalAssetUnit.slice(0, 28))
        const illegalAssetAssetName: AssetName = AssetName.new(illegalAssetUnit.slice(28))
        const paymentMultiAsset = MultiAsset.new()
        const illegalAssets = Assets.new()
        illegalAssets.insert(illegalAssetAssetName, BigNum.from_str("1000"))
        paymentMultiAsset.insert(illegalAssetPolicyId, illegalAssets)
        const paymentValue = Value.new(paymentAmount)
        paymentValue.set_multiasset(paymentMultiAsset)

        // create the payment box
        const paymentBox = TransactionOutput.new(
            Address.from_bech32(event.toAddress),
            paymentValue
        )

        // create the payment box
        const changeBox = TransactionOutput.new(
            Address.from_bech32(bankAddress),
            Value.new(BigNum.from_str(this.adaToLovelaceString(10)))
        )

        return this.mockPaymentTransaction([paymentBox, changeBox], event.sourceTxId)
    }

    /**
     * generates a mocked payment transaction that transfers no assets
     * @param event asset payment event trigger
     * @param bankAddress bank address
     */
    static mockNoAssetsTransferringPaymentTransaction = (event: EventTrigger, bankAddress: string): PaymentTransaction => {
        const lovelacePaymentAmount: BigNum = CardanoConfigs.txMinimumLovelace

        const paymentValue = Value.new(lovelacePaymentAmount)

        // create the payment box
        const paymentBox = TransactionOutput.new(
            Address.from_bech32(event.toAddress),
            paymentValue
        )

        // create the payment box
        const changeBox = TransactionOutput.new(
            Address.from_bech32(bankAddress),
            Value.new(BigNum.from_str(this.adaToLovelaceString(10)))
        )

        return this.mockPaymentTransaction([paymentBox, changeBox], event.sourceTxId)
    }

    /**
     * generates a mocked payment transaction that transfers two assets with same policyId
     * @param event asset payment event trigger
     * @param bankAddress bank address
     */
    static mockMultiAssetsTransferringPaymentTransaction = (event: EventTrigger, bankAddress: string): PaymentTransaction => {
        const lovelacePaymentAmount: BigNum = CardanoConfigs.txMinimumLovelace
        const assetPaymentAmount: BigNum = BigNum.from_str(event.amount)
            .checked_sub(BigNum.from_str(event.bridgeFee))
            .checked_sub(BigNum.from_str(event.networkFee))

        const paymentAssetUnit: Uint8Array = CardanoUtils.getAssetUnitFromConfigFingerPrintMap(event.targetChainTokenId)
        const paymentAssetPolicyId: ScriptHash = ScriptHash.from_bytes(paymentAssetUnit.slice(0, 28))
        const paymentAssetAssetName: AssetName = AssetName.new(paymentAssetUnit.slice(28))
        const illegalAssetAssetName: AssetName = AssetName.new(Buffer.from("7369676d61", "hex"))
        const paymentMultiAsset = MultiAsset.new()
        const paymentAssets = Assets.new()
        paymentAssets.insert(paymentAssetAssetName, assetPaymentAmount)
        paymentAssets.insert(illegalAssetAssetName, BigNum.from_str("100"))
        paymentMultiAsset.insert(paymentAssetPolicyId, paymentAssets)
        const paymentValue = Value.new(lovelacePaymentAmount)
        paymentValue.set_multiasset(paymentMultiAsset)

        // create the payment box
        const paymentBox = TransactionOutput.new(
            Address.from_bech32(event.toAddress),
            paymentValue
        )

        // create the payment box
        const changeBox = TransactionOutput.new(
            Address.from_bech32(bankAddress),
            Value.new(BigNum.from_str(this.adaToLovelaceString(10)))
        )

        return this.mockPaymentTransaction([paymentBox, changeBox], event.sourceTxId)
    }

    /**
     * generates a mocked payment transaction that transfers two assets with same policyId
     * @param event asset payment event trigger
     * @param bankAddress bank address
     */
    static mockTwoAssetsTransferringPaymentTransaction = (event: EventTrigger, bankAddress: string): PaymentTransaction => {
        const lovelacePaymentAmount: BigNum = CardanoConfigs.txMinimumLovelace
        const assetPaymentAmount: BigNum = BigNum.from_str(event.amount)
            .checked_sub(BigNum.from_str(event.bridgeFee))
            .checked_sub(BigNum.from_str(event.networkFee))

        const paymentAssetUnit: Uint8Array = CardanoUtils.getAssetUnitFromConfigFingerPrintMap(event.targetChainTokenId)
        const illegalAssetUnit: Uint8Array = Buffer.from(TestUtils.generateRandomId(), "hex")
        const paymentAssetPolicyId: ScriptHash = ScriptHash.from_bytes(paymentAssetUnit.slice(0, 28))
        const paymentAssetAssetName: AssetName = AssetName.new(paymentAssetUnit.slice(28))
        const illegalAssetPolicyId: ScriptHash = ScriptHash.from_bytes(illegalAssetUnit.slice(0, 28))
        const illegalAssetAssetName: AssetName = AssetName.new(illegalAssetUnit.slice(28))
        const paymentMultiAsset = MultiAsset.new()
        const paymentAssets = Assets.new()
        paymentAssets.insert(paymentAssetAssetName, assetPaymentAmount)
        const illegalAssets = Assets.new()
        illegalAssets.insert(illegalAssetAssetName, BigNum.from_str("1000"))
        paymentMultiAsset.insert(paymentAssetPolicyId, paymentAssets)
        paymentMultiAsset.insert(illegalAssetPolicyId, illegalAssets)
        const paymentValue = Value.new(lovelacePaymentAmount)
        paymentValue.set_multiasset(paymentMultiAsset)

        // create the payment box
        const paymentBox = TransactionOutput.new(
            Address.from_bech32(event.toAddress),
            paymentValue
        )

        // create the payment box
        const changeBox = TransactionOutput.new(
            Address.from_bech32(bankAddress),
            Value.new(BigNum.from_str(this.adaToLovelaceString(10)))
        )

        return this.mockPaymentTransaction([paymentBox, changeBox], event.sourceTxId)
    }

}

export default TestBoxes
