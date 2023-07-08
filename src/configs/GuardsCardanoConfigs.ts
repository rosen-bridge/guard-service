import config from 'config';
import Configs, {
  getChainNetworkName,
  getConfigIntKeyOrDefault,
} from './Configs';
import { rosenConfig } from './RosenConfig';
import { CARDANO_CHAIN, CardanoConfigs } from '@rosen-chains/cardano';

class GuardsCardanoConfigs {
  // service configs
  static chainNetworkName = getChainNetworkName('cardano.chainNetwork', [
    'koios',
  ]);
  static koios = {
    url: config.get<string>('cardano.koios.url'),
    timeout: config.get<number>('cardano.koios.timeout'), // seconds
  };

  // value configs
  // TODO: improve these two parameters: txMinimumLovelace and txFee (#255)
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
  static coldTxConfirmation = getConfigIntKeyOrDefault(
    'cardano.confirmation.cold',
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
    observationTxConfirmation: this.observationConfirmation,
    paymentTxConfirmation: this.paymentConfirmation,
    coldTxConfirmation: this.coldTxConfirmation,
    lockAddress: this.lockAddress,
    coldStorageAddress: this.coldAddress,
    rwtId: this.cardanoContractConfig.RWTId,
    minBoxValue: this.txMinimumLovelace,
    txTtl: this.txTtl,
    aggregatedPublicKey: this.aggregatedPublicKey,
  };
}

export default GuardsCardanoConfigs;
