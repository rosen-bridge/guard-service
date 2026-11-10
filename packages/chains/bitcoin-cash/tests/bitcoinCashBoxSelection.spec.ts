import { describe, expect, it } from 'vitest';

import BitcoinCashBoxSelection from '../lib/bitcoinCashBoxSelection';
import { BitcoinCashUtxo } from '../lib/chainTypes';
import { BCH_MAX_MONEY } from '../lib/constants';

describe('BitcoinCashBoxSelection', () => {
  describe('getBoxInfo', () => {
    /** Build a native UTXO whose authenticated fields can be faulted. */
    const box = (value: unknown, txId = '12'.repeat(32), index = 0) =>
      ({ value, txId, index }) as BitcoinCashUtxo;

    /**
     * @target BitcoinCashBoxSelection.getBoxInfo - preserves exact native
     * assets and outpoint identity
     * @dependencies none
     * @scenario extract an exact maximum native balance with a unique outpoint
     * @expected raw satoshis and the outpoint are preserved, with no tokens
     */
    it('preserves exact native assets and outpoint identity', () => {
      const selection = new BitcoinCashBoxSelection();
      expect(
        selection.getBoxInfo(box(BCH_MAX_MONEY, '12'.repeat(32), 2)),
      ).toEqual({
        id: `${'12'.repeat(32)}.2`,
        assets: { nativeToken: BCH_MAX_MONEY, tokens: [] },
      });
    });

    /**
     * @target BitcoinCashBoxSelection.getBoxInfo - rejects invalid native
     * value %#
     * @dependencies none
     * @scenario supply noninteger, nonpositive or excessive native amounts
     * @expected selection metadata is rejected before an amount can be summed
     */
    it.each([0n, -1n, BCH_MAX_MONEY + 1n, 1, '1', undefined])(
      'rejects invalid native value %#',
      (value) => {
        expect(() =>
          new BitcoinCashBoxSelection().getBoxInfo(box(value)),
        ).toThrow('Invalid BCH selection value');
      },
    );

    /**
     * @target BitcoinCashBoxSelection.getBoxInfo - rejects invalid outpoint %#
     * @dependencies getBchOutpointId
     * @scenario supply an invalid transaction hash or output index
     * @expected the box cannot acquire a valid reservation identity
     */
    it.each([
      ['12', 0],
      ['AA'.repeat(32), 0],
      ['12'.repeat(32), -1],
      ['12'.repeat(32), 0x100000000],
      ['12'.repeat(32), 0.5],
    ])('rejects invalid outpoint %#', (txId, index) => {
      expect(() =>
        new BitcoinCashBoxSelection().getBoxInfo(box(1n, txId, index)),
      ).toThrow();
    });
  });
});
