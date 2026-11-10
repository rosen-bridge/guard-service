import {
  bchContract as bchConfig_bchContract,
  bchValues as bchConfig_bchValues,
} from '../configs/bitcoinCashTestUtils';
import { createBitcoinCashConfigMock } from '../configs/mocked/guardsBitcoinCashConfigs.mock';

describe('constants', () => {
  describe('SUPPORTED_CHAINS', () => {
    describe('BCH RCS guardsBitcoinCashConfigs', () => {
      let values: Record<string, unknown>;
      let contract = bchConfig_bchContract();
      /** Read the synthetic BCH contract and delegate other chain configurations. */
      const reader = vi.fn(() => contract);
      beforeEach(() => {
        vi.resetModules();
        values = bchConfig_bchValues();
        contract = bchConfig_bchContract();
        reader.mockClear();
        vi.doMock('config', () => createBitcoinCashConfigMock(() => values));
        vi.doMock('../../src/configs/rosenConfig', () => ({
          rosenConfig: { contractReader: reader },
        }));
      });
      afterEach(() => {
        vi.doUnmock('config');
        vi.doUnmock('../../src/configs/rosenConfig');
      });
      /**
       * @target SUPPORTED_CHAINS / ACTIVE_CHAINS - lists BCH as supported with
       * its native token/config keys while disabled runtime enumeration
       * excludes it
       * @dependencies Mocked disabled config and the actual exported chain
       * registries.
       * @scenario Disable BCH and inspect supported/active registries plus
       * native-token and config keys..
       * @expected Keep bitcoin-cash supported as bch/bitcoinCash while
       * excluding it from ACTIVE_CHAINS.
       */
      it('lists BCH as supported with its native token/config keys while disabled runtime enumeration excludes it', async () => {
        values = { 'bitcoinCash.enabled': false };
        const {
          SUPPORTED_CHAINS,
          ACTIVE_CHAINS,
          ChainNativeToken,
          ChainConfigKey,
        } = await import('../../src/utils/constants');
        expect(SUPPORTED_CHAINS).toContain('bitcoin-cash');
        expect(ACTIVE_CHAINS).not.toContain('bitcoin-cash');
        expect(ChainNativeToken['bitcoin-cash']).toEqual('bch');
        expect(ChainConfigKey['bitcoin-cash']).toEqual('bitcoinCash');
      });
    });
  });

  describe('ACTIVE_CHAINS', () => {
    describe('BCH RCS guardsBitcoinCashConfigs', () => {
      let values: Record<string, unknown>;
      let contract = bchConfig_bchContract();
      /** Read the synthetic BCH contract and delegate other chain configurations. */
      const reader = vi.fn(() => contract);
      beforeEach(() => {
        vi.resetModules();
        values = bchConfig_bchValues();
        contract = bchConfig_bchContract();
        reader.mockClear();
        vi.doMock('config', () => createBitcoinCashConfigMock(() => values));
        vi.doMock('../../src/configs/rosenConfig', () => ({
          rosenConfig: { contractReader: reader },
        }));
      });
      afterEach(() => {
        vi.doUnmock('config');
        vi.doUnmock('../../src/configs/rosenConfig');
      });
      /**
       * @target ACTIVE_CHAINS - includes explicitly enabled BCH in active
       * runtime enumeration
       * @dependencies Mocked explicit BCH opt-in and the actual active-chain
       * registry.
       * @scenario Enable BCH and import the active-chain registry..
       * @expected Include bitcoin-cash in ACTIVE_CHAINS.
       */
      it('includes explicitly enabled BCH in active runtime enumeration', async () => {
        const { ACTIVE_CHAINS } = await import('../../src/utils/constants');
        expect(ACTIVE_CHAINS).toContain('bitcoin-cash');
      });
    });
  });
});
