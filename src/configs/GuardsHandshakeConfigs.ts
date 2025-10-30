import config from 'config';
import { getChainNetworkName, getConfigIntKeyOrDefault } from './Configs';
import { rosenConfig } from './RosenConfig';
import { HANDSHAKE_CHAIN, HandshakeConfigs } from '@rosen-chains/handshake';

class GuardsHandshakeConfigs {
  // service configs
  static chainNetworkName = getChainNetworkName('handshake.chainNetwork', [
    'rpc',
  ]);
  static rpc = {
    url: config.get<string>('handshake.rpc.url'),
    timeout: config.get<number>('handshake.rpc.timeout'), // seconds
    username: config.has('handshake.rpc.username')
      ? config.get<string>('handshake.rpc.username')
      : undefined,
    password: config.has('handshake.rpc.password')
      ? config.get<string>('handshake.rpc.password')
      : undefined,
    apiKey: config.has('handshake.rpc.apiKey')
      ? config.get<string>('handshake.rpc.apiKey')
      : undefined,
  };

  // value configs
  static txFeeSlippage = config.get<number>('handshake.txFeeSlippage');

  // confirmation configs
  static observationConfirmation = getConfigIntKeyOrDefault(
    'handshake.confirmation.observation',
    6,
  );
  static paymentConfirmation = getConfigIntKeyOrDefault(
    'handshake.confirmation.payment',
    6,
  );
  static coldTxConfirmation = getConfigIntKeyOrDefault(
    'handshake.confirmation.cold',
    6,
  );
  static manualTxConfirmation = getConfigIntKeyOrDefault(
    'handshake.confirmation.manual',
    6,
  );
  static arbitraryTxConfirmation = getConfigIntKeyOrDefault(
    'handshake.confirmation.arbitrary',
    6,
  );

  // the ergo-related contract, addresses and tokens in rosen bridge
  static handshakeContractConfig = rosenConfig.contractReader(HANDSHAKE_CHAIN);

  // handshake addresses
  static aggregatedPublicKey = config.get<string>('handshake.bankPublicKey');

  // tss related configs
  static tssChainCode = config.get<string>('handshake.tssChainCode');
  static derivationPath = config.get<number[]>('handshake.derivationPath');

  // HandshakeChain required configs
  static chainConfigs: HandshakeConfigs = {
    fee: 0n, // fee config is not used in HandshakeChain
    confirmations: {
      observation: this.observationConfirmation,
      payment: this.paymentConfirmation,
      cold: this.coldTxConfirmation,
      manual: this.manualTxConfirmation,
      arbitrary: this.arbitraryTxConfirmation,
    },
    addresses: {
      lock: this.handshakeContractConfig.lockAddress,
      cold: this.handshakeContractConfig.coldAddress,
      permit: this.handshakeContractConfig.permitAddress,
      fraud: this.handshakeContractConfig.fraudAddress,
    },
    rwtId: this.handshakeContractConfig.RWTId,
    aggregatedPublicKey: this.aggregatedPublicKey,
    txFeeSlippage: this.txFeeSlippage,
  };
}

export default GuardsHandshakeConfigs;
