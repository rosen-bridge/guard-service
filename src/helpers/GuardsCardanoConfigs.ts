import config from 'config';
import Configs, {
  getChainNetworkName,
  getConfigIntKeyOrDefault,
} from './Configs';
import { rosenConfig } from './RosenConfig';
import { CARDANO_CHAIN, CardanoConfigs } from '@rosen-chains/cardano';
import * as CardanoWasm from '@emurgo/cardano-serialization-lib-nodejs';

class GuardsCardanoConfigs {
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

  static txBuilderConfig: CardanoWasm.TransactionBuilderConfig =
    CardanoWasm.TransactionBuilderConfigBuilder.new()
      .fee_algo(this.linearFee)
      .pool_deposit(this.protocolParameters.poolDeposit)
      .key_deposit(this.protocolParameters.keyDeposit)
      .max_value_size(this.protocolParameters.maxValueSize)
      .max_tx_size(this.protocolParameters.maxTxSize)
      .coins_per_utxo_word(this.protocolParameters.coinsPerUtxoWord)
      .build();

  // service configs
  static chainNetworkName = getChainNetworkName('cardano.chainNetwork', [
    'koios',
  ]);
  static koios = {
    url: config.get<string>('cardano.koios.url'),
    timeout: getConfigIntKeyOrDefault('cardano.koios.timeout', 8), // seconds
  };
  static blockFrost = {
    projectId: config.get<string>('cardano.blockFrost.projectId'),
  };

  // value configs
  // TODO: improve these two parameters: txMinimumLovelace and txFee
  //  https://git.ergopool.io/ergo/rosen-bridge/ts-guard-service/-/issues/19
  static txMinimumLovelace = BigInt(config.get<string>('cardano.minUtxoValue'));
  static txFee = BigInt(config.get<string>('cardano.fee'));
  static txTtl = getConfigIntKeyOrDefault('cardano.txTtl', 100000);

  // confirmation configs
  static observationConfirmation = getConfigIntKeyOrDefault(
    'cardano.confirmation.observation',
    120
  );
  static paymentConfirmation = getConfigIntKeyOrDefault(
    'cardano.confirmation.payment',
    120
  );

  // the ergo-related contract, addresses and tokens in rosen bridge
  static cardanoContractConfig = rosenConfig.contractReader(CARDANO_CHAIN);

  // cardano addresses
  static coldAddress: string = config.get<string>('cardano.coldStorageAddress');
  static lockAddress = config.get<string>('cardano.lockAddress');
  static aggregatedPublicKey = config.get<string>('cardano.bankPublicKey');

  // Cardano rosen extractor required configs
  static extractorOptions = {
    lockAddress: this.lockAddress,
    tokens: Configs.tokens(),
  };

  // CardanoChain required configs
  static chainConfigs: CardanoConfigs = {
    fee: this.txFee,
    observationTxConfirmation: getConfigIntKeyOrDefault(
      'cardano.confirmation.observation',
      120
    ),
    paymentTxConfirmation: getConfigIntKeyOrDefault(
      'cardano.confirmation.payment',
      120
    ),
    coldTxConfirmation: getConfigIntKeyOrDefault(
      'cardano.confirmation.cold',
      120
    ),
    lockAddress: this.lockAddress,
    coldStorageAddress: this.coldAddress,
    rwtId: this.cardanoContractConfig.RWTId,
    minBoxValue: this.txMinimumLovelace,
    txTtl: this.txTtl,
    aggregatedPublicKey: this.aggregatedPublicKey,
  };
}

export default GuardsCardanoConfigs;
