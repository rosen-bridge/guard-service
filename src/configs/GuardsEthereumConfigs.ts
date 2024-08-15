import config from 'config';
import { getChainNetworkName, getConfigIntKeyOrDefault } from './Configs';
import { rosenConfig } from './RosenConfig';
import { EvmConfigs } from '@rosen-chains/evm';
import { ETHEREUM_CHAIN } from '@rosen-chains/ethereum';

class GuardsEthereumConfigs {
  // service configs
  static chainNetworkName = getChainNetworkName('ethereum.chainNetwork', [
    'rpc',
  ]);
  static rpc = {
    url: config.get<string>('ethereum.rpc.url'),
    authToken: config.has('ethereum.rpc.authToken')
      ? config.get<string>('ethereum.rpc.authToken')
      : undefined,
    timeout: config.get<number>('ethereum.rpc.timeout'), // seconds
    scannerInterval: config.get<number>('ethereum.rpc.scannerInterval'),
    initialHeight: config.get<number>('ethereum.rpc.initialHeight'),
  };

  // value configs
  static maxParallelTx = config.get<number>('ethereum.maxParallelTx');
  static gasPriceSlippage = BigInt(
    config.get<number>('ethereum.gasPriceSlippage')
  );
  static gasLimitSlippage = BigInt(
    config.get<number>('ethereum.gasLimitSlippage')
  );
  static gasLimitMultiplier = BigInt(
    config.get<number>('ethereum.gasLimitMultiplier')
  );

  // confirmation configs
  static observationConfirmation = getConfigIntKeyOrDefault(
    'ethereum.confirmation.observation',
    200
  );
  static paymentConfirmation = getConfigIntKeyOrDefault(
    'ethereum.confirmation.payment',
    200
  );
  static coldTxConfirmation = getConfigIntKeyOrDefault(
    'ethereum.confirmation.cold',
    200
  );
  static manualTxConfirmation = getConfigIntKeyOrDefault(
    'ethereum.confirmation.manual',
    200
  );

  // the ergo-related contract, addresses and tokens in rosen bridge
  static ethereumContractConfig = rosenConfig.contractReader(ETHEREUM_CHAIN);

  // tss related configs
  static tssChainCode = config.get<string>('ethereum.tssChainCode');
  static derivationPath = config.get<number[]>('ethereum.derivationPath');

  // EthereumChain required configs
  static chainConfigs: EvmConfigs = {
    fee: 0n, // fee config is not used in EthereumChain
    confirmations: {
      observation: this.observationConfirmation,
      payment: this.paymentConfirmation,
      cold: this.coldTxConfirmation,
      manual: this.manualTxConfirmation,
    },
    addresses: {
      lock: this.ethereumContractConfig.lockAddress,
      cold: this.ethereumContractConfig.coldAddress,
      permit: this.ethereumContractConfig.permitAddress,
      fraud: this.ethereumContractConfig.fraudAddress,
    },
    rwtId: this.ethereumContractConfig.RWTId,
    maxParallelTx: this.maxParallelTx,
    gasPriceSlippage: this.gasPriceSlippage,
    gasLimitSlippage: this.gasLimitSlippage,
    gasLimitMultiplier: this.gasLimitMultiplier,
  };
}

export default GuardsEthereumConfigs;
