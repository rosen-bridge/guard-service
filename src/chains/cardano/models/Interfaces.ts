import { BigNum, MultiAsset } from '@emurgo/cardano-serialization-lib-nodejs';
import { components } from '@blockfrost/openapi';

interface Asset {
  policy_id: string;
  asset_name: string;
  quantity: string;
  fingerprint: string;
}

interface AssetInfo {
  policyId: Uint8Array;
  assetName: Uint8Array;
}

interface PaymentAddr {
  bech32: string;
  cred: string;
}

interface Utxo {
  payment_addr: PaymentAddr;
  tx_hash: string;
  tx_index: number;
  value: string;
  asset_list: Array<Asset>;
}

interface InputUtxo {
  txHash: string;
  txIndex: number;
}
interface AddressUtxo {
  tx_hash: string;
  tx_index: number;
  value: string;
  asset_list: Array<Asset>;
}

interface UtxoBoxesAssets {
  lovelace: BigNum;
  assets: MultiAsset;
}

interface MetaData {
  [key: string]: Record<string, unknown>;
}

interface RosenData {
  toChain: string;
  toAddress: string;
  bridgeFee: string;
  networkFee: string;
  fromAddress: string;
}

interface KoiosTransaction {
  tx_hash: string;
  block_hash: string;
  inputs: Array<Utxo>;
  outputs: Array<Utxo>;
  metadata?: MetaData;
}

interface KoiosAddressInfo {
  address: string;
  balance: string;
  utxo_set: AddressUtxo[];
}

interface AddressAssets {
  address: string;
  asset_list: Asset[];
}

type TxUtxos = components['schemas']['tx_content_utxo'];

type AddressUtxos = components['schemas']['address_utxo_content'];

export type {
  Utxo,
  InputUtxo,
  Asset,
  AssetInfo,
  UtxoBoxesAssets,
  TxUtxos,
  AddressUtxos,
  KoiosTransaction,
  MetaData,
  RosenData,
  KoiosAddressInfo,
  AddressUtxo,
  AddressAssets,
};
