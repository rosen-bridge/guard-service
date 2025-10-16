import config from 'config';
import { getChainNetworkName } from './configs';
import { rosenConfig } from './rosenConfig';
import {
  BITCOIN_RUNES_CHAIN,
  BitcoinRunesConfigs,
} from '@rosen-chains/bitcoin-runes';
import GuardsBitcoinConfigs from './guardsBitcoinConfigs';

class GuardsBitcoinRunesConfigs {
  // service configs
  static chainNetworkName = getChainNetworkName('bitcoinRunes.chainNetwork', [
    'rpc',
  ]);
  static rpc = {
    url: config.get<string>('bitcoinRunes.rpc.url'),
    username: config.has('bitcoinRunes.rpc.username')
      ? config.get<string>('bitcoinRunes.rpc.username')
      : undefined,
    password: config.has('bitcoinRunes.rpc.password')
      ? config.get<string>('bitcoinRunes.rpc.password')
      : undefined,
    apiKey: config.has('bitcoinRunes.rpc.apiKey')
      ? config.get<string>('bitcoinRunes.rpc.apiKey')
      : undefined,
    rps: config.has('bitcoinRunes.rpc.rps')
      ? config.get<number>('bitcoinRunes.rpc.rps')
      : undefined,
    timeout: config.get<number>('bitcoinRunes.rpc.timeout'),
  };
  static unisat = {
    url: config.get<string>('bitcoinRunes.unisat.url'),
    apiKey: config.has('bitcoinRunes.unisat.apiKey')
      ? config.get<string>('bitcoinRunes.unisat.apiKey')
      : undefined,
    rps: config.has('bitcoinRunes.unisat.rps')
      ? config.get<number>('bitcoinRunes.unisat.rps')
      : undefined,
    timeout: config.get<number>('bitcoinRunes.unisat.timeout'),
  };

  // the ergo-related contract, addresses and tokens in rosen bridge
  static bitcoinRunesContractConfig =
    rosenConfig.contractReader(BITCOIN_RUNES_CHAIN);

  // bitcoinRunes addresses
  static aggregatedPublicKey = config.get<string>('bitcoinRunes.bankPublicKey');

  // tss related configs
  static tssChainCode = config.get<string>('bitcoinRunes.tssChainCode');
  static derivationPath = config.get<number[]>('bitcoinRunes.derivationPath');

  // BitcoinRunesChain required configs
  static chainConfigs: BitcoinRunesConfigs = {
    fee: 0n, // fee config is not used in BitcoinRunesChain
    confirmations: {
      observation: GuardsBitcoinConfigs.observationConfirmation,
      payment: GuardsBitcoinConfigs.paymentConfirmation,
      cold: GuardsBitcoinConfigs.coldTxConfirmation,
      manual: GuardsBitcoinConfigs.manualTxConfirmation,
      arbitrary: GuardsBitcoinConfigs.arbitraryTxConfirmation,
    },
    addresses: {
      lock: this.bitcoinRunesContractConfig.lockAddress,
      cold: this.bitcoinRunesContractConfig.coldAddress,
      permit: this.bitcoinRunesContractConfig.permitAddress,
      fraud: this.bitcoinRunesContractConfig.fraudAddress,
    },
    rwtId: this.bitcoinRunesContractConfig.RWTId,
    aggregatedPublicKey: this.aggregatedPublicKey,
    txFeeSlippage: GuardsBitcoinConfigs.txFeeSlippage,
  };
}

export default GuardsBitcoinRunesConfigs;
