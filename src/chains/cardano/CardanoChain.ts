import {
    Address, AssetName, Assets,
    BigNum, hash_transaction,
    MultiAsset, ScriptHash,
    Transaction, TransactionBuilder, TransactionHash, TransactionInput,
    TransactionOutput, TransactionWitnessSet,
    Value
} from "@emurgo/cardano-serialization-lib-nodejs";
import KoiosApi from "./network/KoiosApi";
import { PaymentTransaction, EventTrigger } from "../../models/Models";
import BaseChain from "../BaseChains";
import CardanoConfigs from "./helpers/CardanoConfigs";
import BlockFrostApi from "./network/BlockFrostApi";
import { Utxo } from "./models/Models";
import CardanoUtils from "./helpers/CardanoUtils";


class CardanoChain implements BaseChain<Transaction> {

    bankAddress = Address.from_bech32(CardanoConfigs.bankAddress)

    /**
     * generates payment transaction of the event from threshold-sig address in target chain
     * @param event the event trigger model
     * @return the generated payment transaction
     */
    generateTransaction = async (event: EventTrigger): Promise<PaymentTransaction> => {
        const txBuilder = TransactionBuilder.new(CardanoConfigs.txBuilderConfig)

        // TODO: take amount of boxes needed for tx, not more
        const bankBoxes = await KoiosApi.getAddressBoxes(CardanoConfigs.bankAddress)

        // add input boxes
        bankBoxes.forEach(box => {
            const txHash = TransactionHash.from_bytes(Buffer.from(box.tx_hash, "hex"))
            const inputBox = TransactionInput.new(txHash, box.tx_index)
            txBuilder.add_input(this.bankAddress, inputBox, Value.new(BigNum.from_str(event.amount)))
        })

        // add output boxes
        if (event.targetChainTokenId === "lovelace")
            this.lovelacePaymentOutputBoxes(event, bankBoxes).forEach(box => txBuilder.add_output(box))
        else
            this.assetPaymentOutputBoxes(event, bankBoxes).forEach(box => txBuilder.add_output(box))

        // set transaction TTL and Fee
        txBuilder.set_ttl(await BlockFrostApi.currentSlot() + CardanoConfigs.txTtl)
        txBuilder.set_fee(CardanoConfigs.txFee)

        // create the transaction
        const txBody = txBuilder.build();
        const tx = Transaction.new(
            txBody,
            TransactionWitnessSet.new(),
            undefined, // transaction metadata
        );

        // create PaymentTransaction object
        const txBytes = tx.to_bytes()
        const txId = Buffer.from(hash_transaction(txBody).to_bytes()).toString('hex')
        const eventId = event.sourceTxId
        const paymentTx = new PaymentTransaction(txId, eventId, txBytes)

        console.log(`Payment transaction for event [${eventId}] generated. TxId: ${txId}`)
        return paymentTx
    }

    /**
     * verifies the payment transaction data with the event
     * @param paymentTx the payment transaction
     * @param event the event trigger model
     * @return true if tx verified
     */
    verifyTransactionWithEvent = (paymentTx: PaymentTransaction, event: EventTrigger): boolean => {
        const tx = Transaction.from_bytes(paymentTx.txBytes)
        const outputBoxes = tx.body().outputs()

        // verify that all other boxes belong to bank
        for (let i = 1; i < outputBoxes.len(); i++)
            if (outputBoxes.get(i).address().to_bech32() !== this.bankAddress.to_bech32()) return false;

        // verify event conditions
        const paymentBox = outputBoxes.get(0)
        if (event.targetChainTokenId === "lovelace") { // ADA payment case
            const lovelacePaymentAmount: BigNum = BigNum.from_str(event.amount)
                .checked_sub(BigNum.from_str(event.bridgeFee))
                .checked_sub(BigNum.from_str(event.networkFee))
            const sizeOfMultiAssets: number | undefined = paymentBox.amount().multiasset()?.len()

            return paymentBox.amount().coin().compare(lovelacePaymentAmount) === 0 &&
                (sizeOfMultiAssets === undefined || sizeOfMultiAssets === 0) &&
                paymentBox.address().to_bech32() === event.toAddress;
        } else { // Token payment case
            const lovelacePaymentAmount: BigNum = CardanoConfigs.txMinimumLovelace
            const assetPaymentAmount: BigNum = BigNum.from_str(event.amount)
                .checked_sub(BigNum.from_str(event.bridgeFee))
                .checked_sub(BigNum.from_str(event.networkFee))
            const sizeOfMultiAssets: number | undefined = paymentBox.amount().multiasset()?.len()
            if (sizeOfMultiAssets === undefined || sizeOfMultiAssets !== 1) return false
            else {
                const multiAssets = paymentBox.amount().multiasset()!
                const multiAssetPolicyId: ScriptHash = multiAssets.keys().get(0)!
                if (multiAssets.get(multiAssetPolicyId)!.len() !== 1) return false
            }

            const paymentAssetUnit: Uint8Array = CardanoUtils.getAssetUnitFromConfigFingerPrintMap(event.targetChainTokenId)
            const paymentAssetPolicyId: ScriptHash = ScriptHash.from_bytes(paymentAssetUnit.slice(0, 28))
            const paymentAssetAssetName: AssetName = AssetName.new(paymentAssetUnit.slice(28))
            const paymentAssetAmount: BigNum | undefined = paymentBox.amount().multiasset()?.get_asset(paymentAssetPolicyId, paymentAssetAssetName)

            return paymentBox.amount().coin().compare(lovelacePaymentAmount) === 0 &&
                paymentAssetAmount !== undefined &&
                paymentAssetAmount.compare(assetPaymentAmount) === 0 &&
                paymentBox.address().to_bech32() === event.toAddress;
        }
    }

    /**
     * converts the transaction model in the chain to bytearray
     * @param tx the transaction model in the chain library
     * @return bytearray representation of the transaction
     */
    serialize = (tx: Transaction): Uint8Array => {
        return tx.to_bytes()
    }

    /**
     * converts bytearray representation of the transaction to the transaction model in the chain
     * @param txBytes bytearray representation of the transaction
     * @return the transaction model in the chain library
     */
    deserialize = (txBytes: Uint8Array): Transaction => {
        return Transaction.from_bytes(txBytes)
    }

    /**
     * generates payment transaction (to pay ADA) of the event from threshold-sig address in cardano chain
     * @param event the event trigger model
     * @param inBoxes threshold-sig address boxes
     * @return the generated payment transaction
     */
    lovelacePaymentOutputBoxes = (event: EventTrigger, inBoxes: Utxo[]): TransactionOutput[] => {
        // calculate assets of payment box
        const paymentAmount: BigNum = BigNum.from_str(event.amount)
            .checked_sub(BigNum.from_str(event.bridgeFee))
            .checked_sub(BigNum.from_str(event.networkFee))

        // create the payment box
        const paymentBox = TransactionOutput.new(
            Address.from_bech32(event.toAddress),
            Value.new(paymentAmount)
        )

        // calculate assets and lovelace of change box
        const multiAsset = MultiAsset.new()
        let changeBoxLovelace: BigNum = BigNum.zero()
        inBoxes.forEach(box => {
            changeBoxLovelace = changeBoxLovelace.checked_add(BigNum.from_str(box.value))

            box.asset_list.forEach(boxAsset => {
                const policyId = ScriptHash.from_bytes(Buffer.from(boxAsset.policy_id, "hex"))
                const assetName = AssetName.new(Buffer.from(boxAsset.asset_name, "hex"))

                const policyAssets = multiAsset.get(policyId)
                if (!policyAssets) {
                    const assetList = Assets.new()
                    assetList.insert(assetName, BigNum.from_str(boxAsset.quantity))
                    multiAsset.insert(policyId, assetList)
                } else {
                    const asset = policyAssets.get(assetName)
                    if (!asset) {
                        policyAssets.insert(assetName, BigNum.from_str(boxAsset.quantity))
                        multiAsset.insert(policyId, policyAssets)
                    } else {
                        const amount = asset.checked_add(BigNum.from_str(boxAsset.quantity))
                        policyAssets.insert(assetName, amount)
                        multiAsset.insert(policyId, policyAssets)
                    }
                }

            })
        })

        // reduce fee and payment amount from change box lovelace
        changeBoxLovelace = changeBoxLovelace.checked_sub(CardanoConfigs.txFee)
            .checked_sub(paymentAmount)

        // create change box
        const changeAmount: Value = Value.new(changeBoxLovelace)
        changeAmount.set_multiasset(multiAsset)
        const changeBox = TransactionOutput.new(this.bankAddress, changeAmount)

        return [paymentBox, changeBox]
    }


    /**
     * generates payment transaction (to pay token) of the event from threshold-sig address in cardano chain
     * @param event the event trigger model
     * @param inBoxes threshold-sig address boxes
     * @return the generated payment transaction
     */
    assetPaymentOutputBoxes = (event: EventTrigger, inBoxes: Utxo[]): TransactionOutput[] => {
        // calculate assets of payment box
        const lovelacePaymentAmount: BigNum = CardanoConfigs.txMinimumLovelace
        const assetPaymentAmount: BigNum = BigNum.from_str(event.amount)
            .checked_sub(BigNum.from_str(event.bridgeFee))
            .checked_sub(BigNum.from_str(event.networkFee))

        const paymentAssetUnit: Uint8Array = CardanoUtils.getAssetUnitFromConfigFingerPrintMap(event.targetChainTokenId)
        const paymentAssetPolicyId: ScriptHash = ScriptHash.from_bytes(paymentAssetUnit.slice(0, 28))
        const paymentAssetAssetName: AssetName = AssetName.new(paymentAssetUnit.slice(28))
        const paymentMultiAsset = MultiAsset.new()
        const paymentAssets = Assets.new()
        paymentAssets.insert(paymentAssetAssetName, assetPaymentAmount)
        paymentMultiAsset.insert(paymentAssetPolicyId, paymentAssets)
        const paymentValue = Value.new(lovelacePaymentAmount)
        paymentValue.set_multiasset(paymentMultiAsset)

        // create the payment box
        const paymentBox = TransactionOutput.new(
            Address.from_bech32(event.toAddress),
            paymentValue
        )

        // calculate assets and lovelace of change box
        const multiAsset = MultiAsset.new()
        let changeBoxLovelace: BigNum = BigNum.zero()
        inBoxes.forEach(box => {
            changeBoxLovelace = changeBoxLovelace.checked_add(BigNum.from_str(box.value))

            box.asset_list.forEach(boxAsset => {
                const policyId = ScriptHash.from_bytes(Buffer.from(boxAsset.policy_id, "hex"))
                const assetName = AssetName.new(Buffer.from(boxAsset.asset_name, "hex"))

                const policyAssets = multiAsset.get(policyId)
                if (!policyAssets) {
                    const assetList = Assets.new()
                    assetList.insert(assetName, BigNum.from_str(boxAsset.quantity))
                    multiAsset.insert(policyId, assetList)
                } else {
                    const asset = policyAssets.get(assetName)
                    if (!asset) {
                        policyAssets.insert(assetName, BigNum.from_str(boxAsset.quantity))
                        multiAsset.insert(policyId, policyAssets)
                    } else {
                        const amount = asset.checked_add(BigNum.from_str(boxAsset.quantity))
                        policyAssets.insert(assetName, amount)
                        multiAsset.insert(policyId, policyAssets)
                    }
                }

            })
        })

        // reduce fee and payment amount from change box lovelace
        changeBoxLovelace = changeBoxLovelace.checked_sub(CardanoConfigs.txFee)
            .checked_sub(lovelacePaymentAmount)

        const paymentAssetAmount: BigNum = multiAsset.get_asset(paymentAssetPolicyId, paymentAssetAssetName)
        multiAsset.set_asset(paymentAssetPolicyId, paymentAssetAssetName, paymentAssetAmount.checked_sub(assetPaymentAmount))

        // create change box
        const changeAmount: Value = Value.new(changeBoxLovelace)
        changeAmount.set_multiasset(multiAsset)
        const changeBox = TransactionOutput.new(this.bankAddress, changeAmount)

        return [paymentBox, changeBox]
    }

}

export default CardanoChain
