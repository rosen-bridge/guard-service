import config from 'config';

import { BASE_CHAIN } from '@rosen-chains/base';
import { EvmConfigs } from '@rosen-chains/evm';

import { getChainNetworkName, getConfigIntKeyOrDefault } from './configs';
import { rosenConfig } from './rosenConfig';

class GuardsBaseConfigs {
  static chainNetworkName = getChainNetworkName('base.chainNetwork', ['rpc']);
  static rpc = {
    url: config.get<string>('base.rpc.url'),
    authToken: config.has('base.rpc.authToken')
      ? config.get<string>('base.rpc.authToken')
      : undefined,
    timeout: config.get<number>('base.rpc.timeout'),
    scannerInterval: config.get<number>('base.rpc.scannerInterval'),
    initialHeight: config.get<number>('base.rpc.initialHeight'),
  };

  static maxParallelTx = config.get<number>('base.maxParallelTx');
  static gasPriceSlippage = BigInt(config.get<number>('base.gasPriceSlippage'));
  static gasLimitSlippage = BigInt(config.get<number>('base.gasLimitSlippage'));
  static gasLimitMultiplier = BigInt(
    config.get<number>('base.gasLimitMultiplier'),
  );
  static gasLimitCap = BigInt(config.get<number>('base.gasLimitCap'));

  static observationConfirmation = getConfigIntKeyOrDefault(
    'base.confirmation.observation',
    20,
  );
  static paymentConfirmation = getConfigIntKeyOrDefault(
    'base.confirmation.payment',
    20,
  );
  static coldTxConfirmation = getConfigIntKeyOrDefault(
    'base.confirmation.cold',
    20,
  );
  static manualTxConfirmation = getConfigIntKeyOrDefault(
    'base.confirmation.manual',
    20,
  );
  static arbitraryTxConfirmation = getConfigIntKeyOrDefault(
    'base.confirmation.arbitrary',
    20,
  );

  static baseContractConfig = rosenConfig.contractReader(BASE_CHAIN);

  static tssChainCode = config.get<string>('base.tssChainCode');
  static derivationPath = config.get<number[]>('base.derivationPath');

  static chainConfigs: EvmConfigs = {
    fee: 0n,
    confirmations: {
      observation: this.observationConfirmation,
      payment: this.paymentConfirmation,
      cold: this.coldTxConfirmation,
      manual: this.manualTxConfirmation,
      arbitrary: this.arbitraryTxConfirmation,
    },
    addresses: {
      lock: this.baseContractConfig.addresses.lock,
      cold: this.baseContractConfig.addresses.cold,
      permit: this.baseContractConfig.addresses.WatcherPermit,
      fraud: this.baseContractConfig.addresses.Fraud,
    },
    rwtId: this.baseContractConfig.tokens.RWTId,
    maxParallelTx: this.maxParallelTx,
    gasPriceSlippage: this.gasPriceSlippage,
    gasLimitSlippage: this.gasLimitSlippage,
    gasLimitMultiplier: this.gasLimitMultiplier,
    gasLimitCap: this.gasLimitCap,
  };
}

export default GuardsBaseConfigs;
