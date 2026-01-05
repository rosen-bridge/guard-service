interface ConfirmationConfigs {
  observation: number;
  payment: number;
  cold: number;
  manual: number;
  arbitrary: number;
}

interface AddressConfigs {
  lock: string;
  cold: string;
  permit: string;
  fraud: string;
}
interface ChainConfigs {
  fee: bigint;
  confirmations: ConfirmationConfigs;
  addresses: AddressConfigs;
  rwtId: string;
}

interface CoveringBoxes<BoxType> {
  covered: boolean;
  boxes: Array<BoxType>;
}

interface TokenInfo {
  id: string;
  value: bigint;
}

interface AssetBalance {
  nativeToken: bigint;
  tokens: Array<TokenInfo>;
}

interface TransactionAssetBalance {
  inputAssets: AssetBalance;
  outputAssets: AssetBalance;
}

interface BoxInfo {
  id: string;
  assets: AssetBalance;
}

interface BlockInfo {
  hash: string;
  parentHash: string;
  height: number;
}

interface SinglePayment {
  address: string;
  assets: AssetBalance;
  extra?: string;
}

type PaymentOrder = Array<SinglePayment>;

interface EventTrigger {
  height: number;
  fromChain: string;
  toChain: string;
  fromAddress: string;
  toAddress: string;
  amount: string;
  bridgeFee: string;
  networkFee: string;
  sourceChainTokenId: string;
  targetChainTokenId: string;
  sourceTxId: string;
  sourceChainHeight: number;
  sourceBlockId: string;
  WIDsHash: string;
  WIDsCount: number;
}

enum SigningStatus {
  Signed,
  UnSigned,
}

interface PaymentTransactionJsonModel {
  network: string;
  txId: string;
  eventId: string;
  txBytes: string;
  txType: string;
}

enum ConfirmationStatus {
  ConfirmedEnough,
  NotConfirmedEnough,
  NotFound,
}

enum TransactionType {
  payment = 'payment',
  reward = 'reward',
  coldStorage = 'cold-storage',
  lock = 'lock',
  manual = 'manual',
  arbitrary = 'arbitrary',
}

interface TokenDetail {
  tokenId: string;
  name: string;
  decimals: number;
}

interface ValidityStatus {
  isValid: boolean;
  details:
    | undefined
    | {
        reason: string;
        unexpected: boolean;
      };
}

export {
  ConfirmationConfigs,
  ChainConfigs,
  CoveringBoxes,
  TokenInfo,
  AssetBalance,
  TransactionAssetBalance,
  BoxInfo,
  BlockInfo,
  SinglePayment,
  PaymentOrder,
  EventTrigger,
  PaymentTransactionJsonModel,
  ConfirmationStatus,
  TransactionType,
  SigningStatus,
  TokenDetail,
  ValidityStatus,
};
