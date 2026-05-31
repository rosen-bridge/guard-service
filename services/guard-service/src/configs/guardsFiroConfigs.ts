import config from 'config';

import { FIRO_CHAIN, FiroConfigs } from '@rosen-chains/firo';

import { getConfigIntKeyOrDefault } from './configs';
import { rosenConfig } from './rosenConfig';

class GuardsFiroConfigs {
  // service configs
  static electrumx = {
    host: config.has('firo.electrumx.host')
      ? config.get<string>('firo.electrumx.host')
      : '127.0.0.1',
    port: config.has('firo.electrumx.port')
      ? config.get<number>('firo.electrumx.port')
      : 50002,
    timeout: config.has('firo.electrumx.timeout')
      ? config.get<number>('firo.electrumx.timeout')
      : 30,
  };

  // value configs
  static txFeeSlippage = config.get<number>('firo.txFeeSlippage');

  // confirmation configs
  static observationConfirmation = getConfigIntKeyOrDefault(
    'firo.confirmation.observation',
    8,
  );
  static paymentConfirmation = getConfigIntKeyOrDefault(
    'firo.confirmation.payment',
    8,
  );
  static coldTxConfirmation = getConfigIntKeyOrDefault(
    'firo.confirmation.cold',
    8,
  );
  static manualTxConfirmation = getConfigIntKeyOrDefault(
    'firo.confirmation.manual',
    8,
  );
  static arbitraryTxConfirmation = getConfigIntKeyOrDefault(
    'firo.confirmation.arbitrary',
    8,
  );

  // the firo-related contract, addresses and tokens in rosen bridge
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
