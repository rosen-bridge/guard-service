import config from 'config';
import { getChainNetworkName, getConfigIntKeyOrDefault } from './Configs';
import { rosenConfig } from './RosenConfig';
import { CARDANO_CHAIN, CardanoConfigs } from '@rosen-chains/cardano';
import { BLOCKFROST_NETWORK } from '@rosen-chains/cardano-blockfrost-network';
import { KOIOS_NETWORK } from '@rosen-chains/cardano-koios-network';

class GuardsCardanoConfigs {
  // service configs
  static chainNetworkName = getChainNetworkName('cardano.chainNetwork', [
    KOIOS_NETWORK,
    BLOCKFROST_NETWORK,
  ]);
  static koios = {
    url: config.get<string>('cardano.koios.url'),
    timeout: config.get<number>('cardano.koios.timeout'), // seconds
    authToken: config.has('cardano.koios.authToken')
      ? config.get<string>('cardano.koios.authToken')
      : undefined,
  };
  static blockfrost = {
    projectId: config.get<string>('cardano.blockfrost.projectId'),
    url: config.has('cardano.blockfrost.url')
      ? config.get<string>('cardano.blockfrost.url')
      : undefined,
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
  static manualTxConfirmation = getConfigIntKeyOrDefault(
    'cardano.confirmation.manual',
    120
  );

  // the ergo-related contract, addresses and tokens in rosen bridge
  static cardanoContractConfig = rosenConfig.contractReader(CARDANO_CHAIN);

  // cardano addresses
  static aggregatedPublicKey = config.get<string>('cardano.bankPublicKey');

  // tss related configs
  static tssChainCode = config.get<string>('cardano.tssChainCode');

  // CardanoChain required configs
  static chainConfigs: CardanoConfigs = {
    fee: this.txFee,
    confirmations: {
      observation: this.observationConfirmation,
      payment: this.paymentConfirmation,
      cold: this.coldTxConfirmation,
      manual: this.manualTxConfirmation,
    },
    addresses: {
      lock: this.cardanoContractConfig.lockAddress,
      cold: this.cardanoContractConfig.coldAddress,
      permit: this.cardanoContractConfig.permitAddress,
      fraud: this.cardanoContractConfig.fraudAddress,
    },
    rwtId: this.cardanoContractConfig.RWTId,
    minBoxValue: this.txMinimumLovelace,
    txTtl: this.txTtl,
    aggregatedPublicKey: this.aggregatedPublicKey,
  };
}

export default GuardsCardanoConfigs;
