import {
  ChainConfigs,
  PaymentTransactionJsonModel,
} from '@rosen-chains/abstract-chain';

interface CardanoConfigs extends ChainConfigs {
  minBoxValue: bigint;
  txTtl: number;
  aggregatedPublicKey: string;
}

interface CardanoAsset {
  policyId: string;
  assetName: string;
  quantity: bigint;
}

interface CardanoUtxo {
  txId: string;
  index: number;
  value: bigint;
  assets: Array<CardanoAsset>;
}

interface CardanoTxInput {
  txId: string;
  index: number;
}

interface CardanoBoxCandidate {
  address: string;
  value: bigint;
  assets: Array<CardanoAsset>;
}

type CardanoMetadata = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  parsedJson: Record<string, string | Record<string, any>>;
  cbor: string;
};

interface CardanoTx {
  id: string;
  inputs: CardanoTxInput[];
  outputs: CardanoBoxCandidate[];
  fee: bigint;
  metadata?: CardanoMetadata;
}

interface CardanoTransactionJsonModel extends PaymentTransactionJsonModel {
  inputUtxos: Array<string>;
}

interface CardanoProtocolParameters {
  minFeeA: number;
  minFeeB: number;
  poolDeposit: string;
  keyDeposit: string;
  maxValueSize: number;
  maxTxSize: number;
  coinsPerUtxoSize: string;
}

export {
  CardanoConfigs,
  CardanoAsset,
  CardanoUtxo,
  CardanoTxInput,
  CardanoBoxCandidate,
  CardanoMetadata,
  CardanoTx,
  CardanoTransactionJsonModel,
  CardanoProtocolParameters,
};
