import {
  AbstractBoxSelection,
  BoxInfo,
} from '@rosen-bridge/abstract-box-selection';

import { getBchOutpointId } from './bitcoinCashUtils';
import { BitcoinCashUtxo } from './chainTypes';
import { BCH_MAX_MONEY } from './constants';

/** Native BCH box metadata for the bounded treasury selection policy. */
export default class BitcoinCashBoxSelection extends AbstractBoxSelection<BitcoinCashUtxo> {
  /**
   * Extracts an authenticated box's outpoint and integer native assets.
   * Parent authentication, maturity and reservation checks belong to the chain.
   * @param box - The BCH UTXO
   * @returns Its unique outpoint and raw satoshi balance
   * @throws When value is not a positive bounded bigint or the outpoint is malformed
   */
  getBoxInfo = (box: BitcoinCashUtxo): BoxInfo => {
    if (
      typeof box.value !== 'bigint' ||
      box.value <= 0n ||
      box.value > BCH_MAX_MONEY
    )
      throw Error('Invalid BCH selection value');
    return {
      id: getBchOutpointId(box.txId, box.index),
      assets: { nativeToken: box.value, tokens: [] },
    };
  };
}
