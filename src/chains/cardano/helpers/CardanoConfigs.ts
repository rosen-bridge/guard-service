import * as CardanoWasm from '@emurgo/cardano-serialization-lib-nodejs';
import { BigNum, TransactionBuilderConfig } from "@emurgo/cardano-serialization-lib-nodejs";
import config from "config";

class CardanoConfigs {

    // txBuilder configs: Cardano protocol parameters
    static protocolParameters = {
        minFeeA: CardanoWasm.BigNum.from_str('44'),
        minFeeB: CardanoWasm.BigNum.from_str('155381'),
        poolDeposit: CardanoWasm.BigNum.from_str('500000000'),
        keyDeposit: CardanoWasm.BigNum.from_str('2000000'),
        maxValueSize: 4000,
        maxTxSize: 8000,
        coinsPerUtxoWord: CardanoWasm.BigNum.from_str('34482')
    }

    static linearFee = CardanoWasm.LinearFee.new(
        this.protocolParameters.minFeeA,
        this.protocolParameters.minFeeB
    );

    static txBuilderConfig: TransactionBuilderConfig = CardanoWasm.TransactionBuilderConfigBuilder.new()
        .fee_algo(this.linearFee)
        .pool_deposit(this.protocolParameters.poolDeposit)
        .key_deposit(this.protocolParameters.keyDeposit)
        .max_value_size(this.protocolParameters.maxValueSize)
        .max_tx_size(this.protocolParameters.maxTxSize)
        .coins_per_utxo_word(this.protocolParameters.coinsPerUtxoWord)
        .build();

    // service configs
    static koios = {
        url: config.get<string>('cardano.koios.url'),
        timeout: config.get<number>('cardano.koios.timeout')
    }
    static blockFrost = {
        projectId: config.get<string>('cardano.blockFrost.projectId'),
        isTestnet: config.get<boolean>('cardano.blockFrost.isTestnet')
    }
    static bankAddress = config.get<string>('cardano.bankAddress')
    static tssPublicKey = config.get<string>('cardano.tssPublicKey')
    static txMinimumLovelace = BigNum.from_str(config.get<string>('cardano.txMinimumLovelace')) // TODO: improve this?
    static txFee = BigNum.from_str(config.get<string>('cardano.txFee')) // TODO: improve this?
    static txTtl = config.get<number>('cardano.txTtl')

    static assetFingerprintUnitTuples: Map<string, Uint8Array> = new Map([
        ["assetFingerPrint", Buffer.from("assetUnitHexString", "hex")]
    ])

    static requiredConfirmation = config.get<number>('cardano.requiredConfirmation')
    static lockAddresses = config.get<Array<string>>('cardano.lockAddresses')
}

export default CardanoConfigs
