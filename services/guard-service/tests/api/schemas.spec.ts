import {
  bchContract as bchConfig_bchContract,
  bchValues as bchConfig_bchValues,
} from '../configs/bitcoinCashTestUtils';
import { createBitcoinCashConfigMock } from '../configs/mocked/guardsBitcoinCashConfigs.mock';

describe('SupportedChainsSchema', () => {
  describe('parse', () => {
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
       * @target SupportedChainsSchema.parse / AddressQuerySchema.parse -
       * accepts BCH chain and address queries while its runtime opt-in is
       * disabled
       * @dependencies Mocked disabled config and the actual
       * SupportedChainsSchema/AddressQuerySchema validators.
       * @scenario Disable BCH and parse bitcoin-cash as a supported chain and
       * an address query..
       * @expected Return bitcoin-cash from both schema validations.
       */
      it('accepts BCH chain and address queries while its runtime opt-in is disabled', async () => {
        values = { 'bitcoinCash.enabled': false };
        const { SupportedChainsSchema, AddressQuerySchema } = await import(
          '../../src/api/schemas'
        );
        expect(SupportedChainsSchema.parse('bitcoin-cash')).toEqual(
          'bitcoin-cash',
        );
        expect(
          AddressQuerySchema.parse({ chain: 'bitcoin-cash' }).chain,
        ).toEqual('bitcoin-cash');
      });
    });
  });
});
