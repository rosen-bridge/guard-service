import config from 'config';

import { FIRO_CHAIN, FiroConfigs } from '@rosen-chains/firo';

import { getChainNetworkName, getConfigIntKeyOrDefault } from './configs';
import { rosenConfig } from './rosenConfig';

class GuardsFiroConfigs {
  // service configs
  static chainNetworkName = getChainNetworkName('firo.chainNetwork', ['rpc']);
  static rpc = {
    url: config.get<string>('firo.rpc.url'),
    username: config.get<string>('firo.rpc.username'),
    password: config.get<string>('firo.rpc.password'),
    timeout: config.get<number>('firo.rpc.timeout'), // seconds
  };

  // value configs
  static txFeeSlippage = config.get<number>('firo.txFeeSlippage');

  // confirmation configs
  static observationConfirmation = getConfigIntKeyOrDefault(
    'firo.confirmation.observation',
    6,
  );
  static paymentConfirmation = getConfigIntKeyOrDefault(
    'firo.confirmation.payment',
    6,
  );
  static coldTxConfirmation = getConfigIntKeyOrDefault(
    'firo.confirmation.cold',
    6,
  );
  static manualTxConfirmation = getConfigIntKeyOrDefault(
    'firo.confirmation.manual',
    6,
  );
  static arbitraryTxConfirmation = getConfigIntKeyOrDefault(
    'firo.confirmation.arbitrary',
    6,
  );

  // the ergo-related contract, addresses and tokens in rosen bridge
  static firoContractConfig = rosenConfig.contractReader(FIRO_CHAIN);

  // firo addresses
  static aggregatedPublicKey = config.get<string>('firo.bankPublicKey');

  // tss related configs
  static tssChainCode = config.get<string>('firo.tssChainCode');
  static derivationPath = config.get<number[]>('firo.derivationPath');

  // FiroChain required configs
  static chainConfigs: FiroConfigs = {
    fee: 0n, // fee config is not used in Firo
    confirmations: {
      observation: this.observationConfirmation,
      payment: this.paymentConfirmation,
      cold: this.coldTxConfirmation,
      manual: this.manualTxConfirmation,
      arbitrary: this.arbitraryTxConfirmation,
    },
    addresses: {
      lock: this.firoContractConfig.addresses.lock,
      cold: this.firoContractConfig.addresses.cold,
      permit: this.firoContractConfig.addresses.WatcherPermit,
      fraud: this.firoContractConfig.addresses.Fraud,
    },
    rwtId: this.firoContractConfig.tokens.RWTId,
    aggregatedPublicKey: this.aggregatedPublicKey,
    txFeeSlippage: this.txFeeSlippage,
  };
}

export default GuardsFiroConfigs;
