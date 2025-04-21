import config from 'config';
import { getChainNetworkName, getConfigIntKeyOrDefault } from './Configs';
import { rosenConfig } from './RosenConfig';
import { DOGE_CHAIN, DogeConfigs } from '@rosen-chains/doge';

class GuardsDogeConfigs {
  // service configs
  static chainNetworkName = getChainNetworkName('doge.chainNetwork', [
    'esplora',
    'blockcypher',
  ]);
  static esplora = {
    url: config.get<string>('doge.esplora.url'),
    timeout: config.get<number>('doge.esplora.timeout'), // seconds
  };
  static blockcypher = {
    url: config.get<string>('doge.blockcypher.url'),
    timeout: config.get<number>('doge.blockcypher.timeout'), // seconds
  };

  // value configs
  static txFeeSlippage = config.get<number>('doge.txFeeSlippage');

  // confirmation configs
  static observationConfirmation = getConfigIntKeyOrDefault(
    'doge.confirmation.observation',
    6
  );
  static paymentConfirmation = getConfigIntKeyOrDefault(
    'doge.confirmation.payment',
    6
  );
  static coldTxConfirmation = getConfigIntKeyOrDefault(
    'doge.confirmation.cold',
    6
  );
  static manualTxConfirmation = getConfigIntKeyOrDefault(
    'doge.confirmation.manual',
    6
  );
  static arbitraryTxConfirmation = getConfigIntKeyOrDefault(
    'doge.confirmation.arbitrary',
    6
  );

  // the doge-related contract, addresses and tokens in rosen bridge
  static dogeContractConfig = rosenConfig.contractReader(DOGE_CHAIN);

  // doge addresses
  static aggregatedPublicKey = config.get<string>('doge.bankPublicKey');

  // tss related configs
  static tssChainCode = config.get<string>('doge.tssChainCode');
  static derivationPath = config.get<number[]>('doge.derivationPath');

  // DogeChain required configs
  static chainConfigs: DogeConfigs = {
    fee: 0n, // fee config is not used in Doge
    confirmations: {
      observation: this.observationConfirmation,
      payment: this.paymentConfirmation,
      cold: this.coldTxConfirmation,
      manual: this.manualTxConfirmation,
      arbitrary: this.arbitraryTxConfirmation,
    },
    addresses: {
      lock: this.dogeContractConfig.lockAddress,
      cold: this.dogeContractConfig.coldAddress,
      permit: this.dogeContractConfig.permitAddress,
      fraud: this.dogeContractConfig.fraudAddress,
    },
    rwtId: this.dogeContractConfig.RWTId,
    aggregatedPublicKey: this.aggregatedPublicKey,
    txFeeSlippage: this.txFeeSlippage,
  };
}

export default GuardsDogeConfigs;
