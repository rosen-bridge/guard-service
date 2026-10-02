import { TokenMap as bchFee_TokenMap } from '@rosen-bridge/tokens';

import bchFee_MinimumFeeHandler from '../../src/handlers/minimumFeeHandler';
import { TokenHandler as bchFee_TokenHandler } from '../../src/handlers/tokenHandler';
import {
  wrapped as bchFee_wrapped,
  event as bchFee_event,
  feeBox as bchFee_feeBox,
} from '../bitcoinCashFeeTestUtils';
import { bchTokenSet as bchFee_bchTokenSet } from '../configs/bitcoinCashFixtures';
import { preserveBitcoinCashMocks } from '../testUtils/mocked/bitcoinCashMockScope.mock';

describe('MinimumFeeHandler', () => {
  describe('getEventFeeConfig', () => {
    describe('BCH RCS bitcoinCashFeeContract', () => {
      let restoreBchMocks: () => void;
      beforeEach(() => {
        restoreBchMocks = preserveBitcoinCashMocks([
          [bchFee_TokenHandler, ['getInstance']],
          [bchFee_MinimumFeeHandler, ['getInstance']],
        ]);
      });
      afterEach(() => restoreBchMocks());
      let tokens: bchFee_TokenMap;
      beforeEach(async () => {
        tokens = new bchFee_TokenMap();
        const config = bchFee_bchTokenSet();
        config[0].ergo.decimals = 6;
        await tokens.updateConfigByJson(config);
        vi.spyOn(bchFee_TokenHandler, 'getInstance').mockReturnValue({
          /** Return the mutable synthetic token map used by this scenario. */
          getTokenMap: () => tokens,
        } as bchFee_TokenHandler);
        const fees = await bchFee_feeBox();
        /** Record token lookup arguments while returning the selected synthetic mapping. */
        const lookup = vi.fn((tokenId: string) => {
          if (tokenId !== bchFee_wrapped)
            throw Error('Wrong source token join');
          return fees;
        });
        vi.spyOn(bchFee_MinimumFeeHandler, 'getInstance').mockReturnValue({
          getMinimumFeeBoxObject: lookup,
        } as unknown as bchFee_MinimumFeeHandler);
      });
      /**
       * @target MinimumFeeHandler.getEventFeeConfig - joins source BCH token
       * to Ergo fee box and selects Ergo target fees at source height
       * @dependencies Reusable synthetic fee box/trigger helper, real
       * BCH8/wrapped6 TokenMap and mocked TokenHandler, fee provider, database
       * and verification seams.
       * @scenario joins source BCH token to Ergo fee box and selects Ergo
       * target fees at source height.
       * @expected Join the source BCH wrapped token to its fee box, select the
       * target chain at source height, and reject absent mappings or rows.
       */
      it('joins source BCH token to Ergo fee box and selects Ergo target fees at source height', () => {
        const fees = bchFee_MinimumFeeHandler.getEventFeeConfig(bchFee_event());
        expect(fees.bridgeFee).toEqual(11n);
        expect(fees.networkFee).toEqual(21n);
      });
      /**
       * @target MinimumFeeHandler.getEventFeeConfig - selects BCH target fees
       * using Ergo source height, independently of trigger height
       * @dependencies Reusable synthetic fee box/trigger helper, real
       * BCH8/wrapped6 TokenMap and mocked TokenHandler, fee provider, database
       * and verification seams.
       * @scenario selects BCH target fees using Ergo source height,
       * independently of trigger height.
       * @expected Join the source BCH wrapped token to its fee box, select the
       * target chain at source height, and reject absent mappings or rows.
       */
      it('selects BCH target fees using Ergo source height, independently of trigger height', () => {
        const fees = bchFee_MinimumFeeHandler.getEventFeeConfig(
          bchFee_event({
            fromChain: 'ergo',
            toChain: 'bitcoin-cash',
            sourceChainTokenId: bchFee_wrapped,
            targetChainTokenId: 'bch',
            sourceChainHeight: 301,
          }),
        );
        expect(fees.bridgeFee).toEqual(32n);
        expect(fees.networkFee).toEqual(42n);
      });
      /**
       * @target MinimumFeeHandler.getEventFeeConfig - does not activate a fee
       * row at its exact threshold
       * @dependencies Reusable synthetic fee box/trigger helper, real
       * BCH8/wrapped6 TokenMap and mocked TokenHandler, fee provider, database
       * and verification seams.
       * @scenario does not activate a fee row at its exact threshold.
       * @expected Join the source BCH wrapped token to its fee box, select the
       * target chain at source height, and reject absent mappings or rows.
       */
      it('does not activate a fee row at its exact threshold', () => {
        expect(
          bchFee_MinimumFeeHandler.getEventFeeConfig(
            bchFee_event({ sourceChainHeight: 150 }),
          ).bridgeFee,
        ).toEqual(11n);
        expect(
          bchFee_MinimumFeeHandler.getEventFeeConfig(
            bchFee_event({ sourceChainHeight: 151 }),
          ).bridgeFee,
        ).toEqual(12n);
      });
      /**
       * @target MinimumFeeHandler.getEventFeeConfig - rejects source height at
       * the first threshold despite a later Ergo trigger
       * @dependencies Reusable synthetic fee box/trigger helper, real
       * BCH8/wrapped6 TokenMap and mocked TokenHandler, fee provider, database
       * and verification seams.
       * @scenario rejects source height at the first threshold despite a later
       * Ergo trigger.
       * @expected Join the source BCH wrapped token to its fee box, select the
       * target chain at source height, and reject absent mappings or rows.
       */
      it('rejects source height at the first threshold despite a later Ergo trigger', () => {
        expect(() =>
          bchFee_MinimumFeeHandler.getEventFeeConfig(
            bchFee_event({ sourceChainHeight: 100 }),
          ),
        ).toThrow('does not support height');
      });
      /**
       * @target MinimumFeeHandler.getEventFeeConfig - rejects an absent
       * source-token mapping
       * @dependencies Reusable synthetic fee box/trigger helper, real
       * BCH8/wrapped6 TokenMap and mocked TokenHandler, fee provider, database
       * and verification seams.
       * @scenario rejects an absent source-token mapping.
       * @expected Join the source BCH wrapped token to its fee box, select the
       * target chain at source height, and reject absent mappings or rows.
       */
      it('rejects an absent source-token mapping', () => {
        expect(() =>
          bchFee_MinimumFeeHandler.getEventFeeConfig(
            bchFee_event({ sourceChainTokenId: 'missing' }),
          ),
        ).toThrow();
      });
      /**
       * @target MinimumFeeHandler.getEventFeeConfig - rejects absent target
       * chain fee entry rather than falling back to source
       * @dependencies Reusable synthetic fee box/trigger helper, real
       * BCH8/wrapped6 TokenMap and mocked TokenHandler, fee provider, database
       * and verification seams.
       * @scenario rejects absent target chain fee entry rather than falling
       * back to source.
       * @expected Join the source BCH wrapped token to its fee box, select the
       * target chain at source height, and reject absent mappings or rows.
       */
      it('rejects absent target chain fee entry rather than falling back to source', () => {
        expect(() =>
          bchFee_MinimumFeeHandler.getEventFeeConfig(
            bchFee_event({ toChain: 'bitcoin' }),
          ),
        ).toThrow('not supported');
      });
    });
  });
});
