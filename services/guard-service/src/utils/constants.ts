import { BINANCE_CHAIN, BNB } from '@rosen-chains/binance';
import { BITCOIN_CHAIN, BTC } from '@rosen-chains/bitcoin';
import { BITCOIN_RUNES_CHAIN } from '@rosen-chains/bitcoin-runes';
import { ADA, CARDANO_CHAIN } from '@rosen-chains/cardano';
import { DOGE, DOGE_CHAIN } from '@rosen-chains/doge';
import { ERG, ERGO_CHAIN } from '@rosen-chains/ergo';
import { ETH, ETHEREUM_CHAIN } from '@rosen-chains/ethereum';
import { FIRO, FIRO_CHAIN } from '@rosen-chains/firo';
import { HANDSHAKE_CHAIN, HNS } from '@rosen-chains/handshake';

class EventStatus {
  static pendingPayment = 'pending-payment';
  static pendingReward = 'pending-reward';
  static inPayment = 'in-payment';
  static inReward = 'in-reward';
  static completed = 'completed';
  static spent = 'spent'; // same as completed but no data is available about its process
  static rejected = 'rejected';
  static timeout = 'timeout';
  static reachedLimit = 'reached-limit';
  static paymentWaiting = 'payment-waiting';
  static rewardWaiting = 'reward-waiting';
}

class TransactionStatus {
  static approved = 'approved';
  static inSign = 'in-sign';
  static signFailed = 'sign-failed';
  static signed = 'signed';
  static sent = 'sent';
  static invalid = 'invalid';
  static completed = 'completed';
}

enum RevenuePeriod {
  year = 'year',
  month = 'month',
  week = 'week',
}
const RevenuePeriodWindow: Record<RevenuePeriod, number | undefined> = {
  [RevenuePeriod.year]: undefined,
  [RevenuePeriod.month]: 33_696_000, // 13 months
  [RevenuePeriod.week]: 5_443_000, // 9 weeks
};

const EventUnexpectedFailsLimit = 2;
const OrderUnexpectedFailsLimit = 1;
const DefaultApiLimit = 100;
const DefaultAssetApiLimit = 10;
const DefaultRevenueApiCount = 10;
const ADA_DECIMALS = 6;
const ERG_DECIMALS = 9;

const SUPPORTED_CHAINS = [
  ERGO_CHAIN,
  CARDANO_CHAIN,
  BITCOIN_CHAIN,
  ETHEREUM_CHAIN,
  BINANCE_CHAIN,
  DOGE_CHAIN,
  FIRO_CHAIN,
  HANDSHAKE_CHAIN,
  BITCOIN_RUNES_CHAIN,
];

enum RevenueType {
  fraud = 'fraud',
  bridgeFee = 'bridge-fee',
  emission = 'emission',
  networkFee = 'network-fee',
}

enum TssAlgorithms {
  curve = 'ecdsa',
  edward = 'eddsa',
}

const ChainNativeToken: Record<string, string> = {
  [ERGO_CHAIN]: ERG,
  [CARDANO_CHAIN]: ADA,
  [BITCOIN_CHAIN]: BTC,
  [ETHEREUM_CHAIN]: ETH,
  [DOGE_CHAIN]: DOGE,
  [FIRO_CHAIN]: FIRO,
  [HANDSHAKE_CHAIN]: HNS,
  [BINANCE_CHAIN]: BNB,
  [BITCOIN_RUNES_CHAIN]: BTC,
};

const ChainConfigKey: Record<string, string> = {
  [ERGO_CHAIN]: ERGO_CHAIN,
  [CARDANO_CHAIN]: CARDANO_CHAIN,
  [BITCOIN_CHAIN]: BITCOIN_CHAIN,
  [ETHEREUM_CHAIN]: ETHEREUM_CHAIN,
  [DOGE_CHAIN]: DOGE_CHAIN,
  [FIRO_CHAIN]: FIRO_CHAIN,
  [HANDSHAKE_CHAIN]: HANDSHAKE_CHAIN,
  [BINANCE_CHAIN]: BINANCE_CHAIN,
  [BITCOIN_RUNES_CHAIN]: 'bitcoinRunes',
};

enum OrderStatus {
  pending = 'pending',
  inProcess = 'in-process',
  completed = 'completed',
  timeout = 'timeout',
  waiting = 'waiting',
  reachedLimit = 'reached-limit',
}

const ERGO_BLOCK_TIME = 120;
const ETHEREUM_BLOCK_TIME = 12;
const BINANCE_BLOCK_TIME = 3;

export {
  EventStatus,
  TransactionStatus,
  RevenuePeriod,
  RevenuePeriodWindow,
  EventUnexpectedFailsLimit,
  OrderUnexpectedFailsLimit,
  DefaultApiLimit,
  DefaultRevenueApiCount,
  DefaultAssetApiLimit,
  ADA_DECIMALS,
  ERG_DECIMALS,
  SUPPORTED_CHAINS,
  RevenueType,
  TssAlgorithms,
  ChainNativeToken,
  ChainConfigKey,
  OrderStatus,
  ERGO_BLOCK_TIME,
  ETHEREUM_BLOCK_TIME,
  BINANCE_BLOCK_TIME,
};
