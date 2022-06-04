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
    static bankAddress: string = config.get<string>('cardano.bankAddress')
    static txMinimumLovelace: BigNum = BigNum.from_str(config.get<string>('cardano.txMinimumLovelace')) // TODO: improve this?
    static txFee: BigNum  = BigNum.from_str(config.get<string>('cardano.txFee')) // TODO: improve this?
    static txTtl: number  = config.get<number>('cardano.txTtl')

    static assetFingerprintUnitTuples: Map<string, Uint8Array> = new Map([
        ["assetFingerPrint", Buffer.from("assetUnitHexString", "hex")]
    ])

}

export default CardanoConfigs
