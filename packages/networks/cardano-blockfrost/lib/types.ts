import { components } from '@blockfrost/openapi';

import { UnexpectedApiError } from '@rosen-chains/abstract-chain';
import { CardanoAsset } from '@rosen-chains/cardano';

export class BlockFrostNullValueError extends UnexpectedApiError {
  constructor(msg: string) {
    super('BlockFrostNullValueError: ' + msg);
  }
}

export type BlockFrostAsset =
  components['schemas']['address_content']['amount'][0];
export type PartialBlockFrostInput = {
  tx_hash: string;
  output_index: number;
  amount: Array<BlockFrostAsset>;
};
export type BlockFrostOutput =
  components['schemas']['tx_content_utxo']['outputs'][0];
export type BlockFrostAddressUtxos =
  components['schemas']['address_utxo_content'];

export interface CardanoBalance {
  lovelace: bigint;
  assets: Array<CardanoAsset>;
}
