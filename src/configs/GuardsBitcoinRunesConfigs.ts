import config from 'config';
import { getChainNetworkName, getConfigIntKeyOrDefault } from './Configs';
import { rosenConfig } from './RosenConfig';
import {
  BITCOIN_RUNES_CHAIN,
  BitcoinRunesConfigs,
} from '@rosen-chains/bitcoin-runes';

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
  };
  static unisat = {
    url: config.get<string>('bitcoinRunes.unisat.url'),
    apiKey: config.has('bitcoinRunes.unisat.apiKey')
      ? config.get<string>('bitcoinRunes.unisat.apiKey')
      : undefined,
    rps: config.has('bitcoinRunes.unisat.rps')
      ? config.get<number>('bitcoinRunes.unisat.rps')
      : undefined,
  };

  // value configs
  static txFeeSlippage = config.get<number>('bitcoinRunes.txFeeSlippage');

  // confirmation configs
  static observationConfirmation = getConfigIntKeyOrDefault(
    'bitcoinRunes.confirmation.observation',
    6
  );
  static paymentConfirmation = getConfigIntKeyOrDefault(
    'bitcoinRunes.confirmation.payment',
    6
  );
  static coldTxConfirmation = getConfigIntKeyOrDefault(
    'bitcoinRunes.confirmation.cold',
    6
  );
  static manualTxConfirmation = getConfigIntKeyOrDefault(
    'bitcoinRunes.confirmation.manual',
    6
  );
  static arbitraryTxConfirmation = getConfigIntKeyOrDefault(
    'bitcoinRunes.confirmation.arbitrary',
    6
  );

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
      observation: this.observationConfirmation,
      payment: this.paymentConfirmation,
      cold: this.coldTxConfirmation,
      manual: this.manualTxConfirmation,
      arbitrary: this.arbitraryTxConfirmation,
    },
    addresses: {
      lock: this.bitcoinRunesContractConfig.lockAddress,
      cold: this.bitcoinRunesContractConfig.coldAddress,
      permit: this.bitcoinRunesContractConfig.permitAddress,
      fraud: this.bitcoinRunesContractConfig.fraudAddress,
    },
    rwtId: this.bitcoinRunesContractConfig.RWTId,
    aggregatedPublicKey: this.aggregatedPublicKey,
    txFeeSlippage: this.txFeeSlippage,
  };
}

export default GuardsBitcoinRunesConfigs;
