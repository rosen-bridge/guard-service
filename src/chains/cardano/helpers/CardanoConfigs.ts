import * as CardanoWasm from '@emurgo/cardano-serialization-lib-nodejs';
import {
  BigNum,
  TransactionBuilderConfig,
} from '@emurgo/cardano-serialization-lib-nodejs';
import config from 'config';
import { RosenConfig, rosenConfig } from '../../../helpers/RosenConfig';
import ChainsConstants from '../../ChainsConstants';
import Configs from '../../../helpers/Configs';

class CardanoConfigs {
  // txBuilder configs: Cardano protocol parameters
  static protocolParameters = {
    minFeeA: CardanoWasm.BigNum.from_str('44'),
    minFeeB: CardanoWasm.BigNum.from_str('155381'),
    poolDeposit: CardanoWasm.BigNum.from_str('500000000'),
    keyDeposit: CardanoWasm.BigNum.from_str('2000000'),
    maxValueSize: 4000,
    maxTxSize: 8000,
    coinsPerUtxoWord: CardanoWasm.BigNum.from_str('34482'),
  };

  static linearFee = CardanoWasm.LinearFee.new(
    this.protocolParameters.minFeeA,
    this.protocolParameters.minFeeB
  );

  static txBuilderConfig: TransactionBuilderConfig =
    CardanoWasm.TransactionBuilderConfigBuilder.new()
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
    timeout: config.get<number>('cardano.koios.timeout'), // seconds
  };
  static blockFrost = {
    projectId: config.get<string>('cardano.blockFrost.projectId'),
  };
  static bankAddress = config.get<string>('cardano.bankAddress');
  static aggregatedPublicKey = config.get<string>('cardano.bankPublicKey');
  static txTtl = config.get<number>('cardano.txTtl');
  // TODO: improve these two parameters: txMinimumLovelace and txFee
  //  https://git.ergopool.io/ergo/rosen-bridge/ts-guard-service/-/issues/19
  static txMinimumLovelace = BigNum.from_str(
    config.get<string>('cardano.minUtxoValue')
  );
  static txFee = BigNum.from_str(config.get<string>('cardano.fee'));

  static assetFingerprintUnitTuples: Map<string, Uint8Array> = new Map([
    ['assetFingerPrint', Buffer.from('assetUnitHexString', 'hex')],
  ]);

  static observationConfirmation = config.get<number>(
    'cardano.observationConfirmation'
  );
  static paymentConfirmation = config.get<number>(
    'cardano.paymentConfirmation'
  );
  static lockAddresses = config.get<Array<string>>('cardano.lockAddresses');

  /**
   * returns the ergo-related contract, addresses and tokens in rosen bridge
   */
  static cardanoContractConfig = rosenConfig.contractReader(
    ChainsConstants.cardano
  );
  static coldAddress: string = config.get<string>('cardano.coldStorageAddress');
}

export default CardanoConfigs;
