import config from 'config';
import { getChainNetworkName, getConfigIntKeyOrDefault } from './Configs';
import { rosenConfig } from './RosenConfig';
import { EvmConfigs } from '@rosen-chains/evm';
import { BINANCE_CHAIN } from '@rosen-chains/binance';

class GuardsBinanceConfigs {
  // service configs
  static chainNetworkName = getChainNetworkName('binance.chainNetwork', [
    'rpc',
  ]);
  static rpc = {
    url: config.get<string>('binance.rpc.url'),
    authToken: config.has('binance.rpc.authToken')
      ? config.get<string>('binance.rpc.authToken')
      : undefined,
    timeout: config.get<number>('binance.rpc.timeout'), // seconds
    scannerInterval: config.get<number>('binance.rpc.scannerInterval'),
    initialHeight: config.get<number>('binance.rpc.initialHeight'),
  };

  // value configs
  static maxParallelTx = config.get<number>('binance.maxParallelTx');
  static gasPriceSlippage = BigInt(
    config.get<number>('binance.gasPriceSlippage')
  );
  static gasLimitSlippage = BigInt(
    config.get<number>('binance.gasLimitSlippage')
  );
  static gasLimitMultiplier = BigInt(
    config.get<number>('binance.gasLimitMultiplier')
  );
  static gasLimitCap = BigInt(config.get<number>('binance.gasLimitCap'));

  // confirmation configs
  static observationConfirmation = getConfigIntKeyOrDefault(
    'binance.confirmation.observation',
    200
  );
  static paymentConfirmation = getConfigIntKeyOrDefault(
    'binance.confirmation.payment',
    200
  );
  static coldTxConfirmation = getConfigIntKeyOrDefault(
    'binance.confirmation.cold',
    200
  );
  static manualTxConfirmation = getConfigIntKeyOrDefault(
    'binance.confirmation.manual',
    200
  );
  static arbitraryTxConfirmation = getConfigIntKeyOrDefault(
    'binance.confirmation.arbitrary',
    200
  );

  // the ergo-related contract, addresses and tokens in rosen bridge
  static binanceContractConfig = rosenConfig.contractReader(BINANCE_CHAIN);

  // tss related configs
  static tssChainCode = config.get<string>('binance.tssChainCode');
  static derivationPath = config.get<number[]>('binance.derivationPath');

  // BinanceChain required configs
  static chainConfigs: EvmConfigs = {
    fee: 0n, // fee config is not used in BinanceChain
    confirmations: {
      observation: this.observationConfirmation,
      payment: this.paymentConfirmation,
      cold: this.coldTxConfirmation,
      manual: this.manualTxConfirmation,
      arbitrary: this.arbitraryTxConfirmation,
    },
    addresses: {
      lock: this.binanceContractConfig.lockAddress,
      cold: this.binanceContractConfig.coldAddress,
      permit: this.binanceContractConfig.permitAddress,
      fraud: this.binanceContractConfig.fraudAddress,
    },
    rwtId: this.binanceContractConfig.RWTId,
    maxParallelTx: this.maxParallelTx,
    gasPriceSlippage: this.gasPriceSlippage,
    gasLimitSlippage: this.gasLimitSlippage,
    gasLimitMultiplier: this.gasLimitMultiplier,
    gasLimitCap: this.gasLimitCap,
  };
}

export default GuardsBinanceConfigs;
