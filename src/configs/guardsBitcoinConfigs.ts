import config from 'config';

import { BITCOIN_CHAIN, BitcoinConfigs } from '@rosen-chains/bitcoin';

import { getChainNetworkName, getConfigIntKeyOrDefault } from './configs';
import { rosenConfig } from './rosenConfig';

class GuardsBitcoinConfigs {
  // service configs
  static chainNetworkName = getChainNetworkName('bitcoin.chainNetwork', [
    'esplora',
  ]);
  static esplora = {
    url: config.get<string>('bitcoin.esplora.url'),
    timeout: config.get<number>('bitcoin.esplora.timeout'), // seconds
  };

  // value configs
  static txFeeSlippage = config.get<number>('bitcoin.txFeeSlippage');

  // confirmation configs
  static observationConfirmation = getConfigIntKeyOrDefault(
    'bitcoin.confirmation.observation',
    2,
  );
  static paymentConfirmation = getConfigIntKeyOrDefault(
    'bitcoin.confirmation.payment',
    2,
  );
  static coldTxConfirmation = getConfigIntKeyOrDefault(
    'bitcoin.confirmation.cold',
    2,
  );
  static manualTxConfirmation = getConfigIntKeyOrDefault(
    'bitcoin.confirmation.manual',
    2,
  );
  static arbitraryTxConfirmation = getConfigIntKeyOrDefault(
    'bitcoin.confirmation.arbitrary',
    2,
  );

  // the ergo-related contract, addresses and tokens in rosen bridge
  static bitcoinContractConfig = rosenConfig.contractReader(BITCOIN_CHAIN);

  // bitcoin addresses
  static aggregatedPublicKey = config.get<string>('bitcoin.bankPublicKey');

  // tss related configs
  static tssChainCode = config.get<string>('bitcoin.tssChainCode');
  static derivationPath = config.get<number[]>('bitcoin.derivationPath');

  // BitcoinChain required configs
  static chainConfigs: BitcoinConfigs = {
    fee: 0n, // fee config is not used in BitcoinChain
    confirmations: {
      observation: this.observationConfirmation,
      payment: this.paymentConfirmation,
      cold: this.coldTxConfirmation,
      manual: this.manualTxConfirmation,
      arbitrary: this.arbitraryTxConfirmation,
    },
    addresses: {
      lock: this.bitcoinContractConfig.lockAddress,
      cold: this.bitcoinContractConfig.coldAddress,
      permit: this.bitcoinContractConfig.permitAddress,
      fraud: this.bitcoinContractConfig.fraudAddress,
    },
    rwtId: this.bitcoinContractConfig.RWTId,
    aggregatedPublicKey: this.aggregatedPublicKey,
    txFeeSlippage: this.txFeeSlippage,
  };
}

export default GuardsBitcoinConfigs;
