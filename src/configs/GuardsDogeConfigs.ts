import config from 'config';
import { getChainNetworkName, getConfigIntKeyOrDefault } from './Configs';
import { rosenConfig } from './RosenConfig';
import { DOGE_CHAIN, DogeConfigs } from '@rosen-chains/doge';

class GuardsDogeConfigs {
  // service configs
  static chainNetworkName = getChainNetworkName('doge.chainNetwork', [
    'esplora',
    'rpc-blockcypher',
  ]);
  static esplora = {
    url: config.get<string>('doge.esplora.url'),
    timeout: config.get<number>('doge.esplora.timeout'), // seconds
  };
  static blockcypher = {
    url: config.get<string>('doge.blockcypher.url'),
    timeout: config.get<number>('doge.blockcypher.timeout'), // seconds
  };
  static rpc = {
    url: config.get<string>('doge.rpc.url'),
    timeout: config.get<number>('doge.rpc.timeout'), // seconds
    username: config.has('doge.rpc.username')
      ? config.get<string>('doge.rpc.username')
      : undefined,
    password: config.has('doge.rpc.password')
      ? config.get<string>('doge.rpc.password')
      : undefined,
    apiKey: config.has('doge.rpc.apiKey')
      ? config.get<string>('doge.rpc.apiKey')
      : undefined,
  };

  // value configs
  static txFeeSlippage = config.get<number>('doge.txFeeSlippage');

  // confirmation configs
  static signFailedConfirmationCheckPercent = getConfigIntKeyOrDefault(
    'doge.confirmationCheckPercent.signFailedTx',
    10
  );
  static sentConfirmationCheckPercent = getConfigIntKeyOrDefault(
    'doge.confirmationCheckPercent.sentTx',
    60
  );
  static observationConfirmation = getConfigIntKeyOrDefault(
    'doge.confirmation.observation',
    40
  );
  static paymentConfirmation = getConfigIntKeyOrDefault(
    'doge.confirmation.payment',
    40
  );
  static coldTxConfirmation = getConfigIntKeyOrDefault(
    'doge.confirmation.cold',
    40
  );
  static manualTxConfirmation = getConfigIntKeyOrDefault(
    'doge.confirmation.manual',
    40
  );
  static arbitraryTxConfirmation = getConfigIntKeyOrDefault(
    'doge.confirmation.arbitrary',
    40
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
