import { expect } from 'chai';
import { beforeEach } from 'mocha';
import CardanoTestBoxes from '../cardano/testUtils/TestBoxes';
import { resetMockedCardanoTrack } from '../mocked/MockedCardanoTrack';
import {
  mockKoiosGetAddressAssets,
  mockKoiosGetAddressInfo,
  resetKoiosApiCalls,
} from './mocked/MockedKoios';
import CardanoConfigs from '../../../src/chains/cardano/helpers/CardanoConfigs';
import { UtxoBoxesAssets } from '../../../src/chains/cardano/models/Interfaces';
import {
  AssetName,
  BigNum,
  MultiAsset,
  ScriptHash,
} from '@emurgo/cardano-serialization-lib-nodejs';
import CardanoTrack from '../../../src/chains/cardano/CardanoTrack';
import Utils from '../../../src/helpers/Utils';

describe('CardanoTrack', () => {
  describe('hasLockAddressEnoughAssets', () => {
    beforeEach('mock KoiosApi', async () => {
      resetKoiosApiCalls();
      resetMockedCardanoTrack();
    });

    /**
     * Target: testing hasLockAddressEnoughAssets
     * Dependencies:
     *    KoiosApi
     * Scenario:
     *    Mock KoiosApi getAddressInfo to return test lovelace balance
     *    Mock KoiosApi getAddressAssets to return test assets
     *    Mock required assets
     *    Run test
     *    Check return value.
     * Expected Output:
     *    It should return false
     */
    it('should return false when there is NOT enough ada in address', async () => {
      // mock address info and assets
      mockKoiosGetAddressInfo(
        CardanoConfigs.bankAddress,
        CardanoTestBoxes.mediumLovelaceAddressInfo
      );
      mockKoiosGetAddressAssets(
        CardanoConfigs.bankAddress,
        CardanoTestBoxes.mediumAddressAssets
      );

      // mock required assets
      const multiAsset = MultiAsset.new();
      multiAsset.set_asset(
        ScriptHash.from_hex(
          'ace7bcc2ce705679149746620de3a84660ce57573df54b5a096e39a2'
        ),
        AssetName.new(Utils.hexStringToUint8Array('7369676d61')),
        BigNum.from_str('1000000000')
      );
      multiAsset.set_asset(
        ScriptHash.from_hex(
          '22c3b86a5b88a78b5de52f4aed2831d1483b3b7681f1ee2569538130'
        ),
        AssetName.new(Utils.hexStringToUint8Array('1111111111')),
        BigNum.from_str('5000000000')
      );
      const requiredAssets: UtxoBoxesAssets = {
        lovelace: BigNum.from_str('500000000'),
        assets: multiAsset,
      };

      // run test
      const result = await CardanoTrack.hasLockAddressEnoughAssets(
        requiredAssets
      );

      // verify result
      expect(result).to.be.false;
    });

    /**
     * Target: testing hasLockAddressEnoughAssets
     * Dependencies:
     *    KoiosApi
     * Scenario:
     *    Mock KoiosApi getAddressInfo to return test lovelace balance
     *    Mock KoiosApi getAddressAssets to return test assets
     *    Mock required assets
     *    Run test
     *    Check return value.
     * Expected Output:
     *    It should return false
     */
    it('should return false when there is NOT enough assets in address', async () => {
      // mock address info and assets
      mockKoiosGetAddressInfo(
        CardanoConfigs.bankAddress,
        CardanoTestBoxes.mediumLovelaceAddressInfo
      );
      mockKoiosGetAddressAssets(
        CardanoConfigs.bankAddress,
        CardanoTestBoxes.mediumAddressAssets
      );

      // mock required assets
      const multiAsset = MultiAsset.new();
      multiAsset.set_asset(
        ScriptHash.from_hex(
          'ace7bcc2ce705679149746620de3a84660ce57573df54b5a096e39a2'
        ),
        AssetName.new(Utils.hexStringToUint8Array('7369676d61')),
        BigNum.from_str('1000000000')
      );
      multiAsset.set_asset(
        ScriptHash.from_hex(
          '22c3b86a5b88a78b5de52f4aed2831d1483b3b7681f1ee2569538130'
        ),
        AssetName.new(Utils.hexStringToUint8Array('1111111111')),
        BigNum.from_str('665000000000')
      );
      const requiredAssets: UtxoBoxesAssets = {
        lovelace: BigNum.from_str('100000000'),
        assets: multiAsset,
      };

      // run test
      const result = await CardanoTrack.hasLockAddressEnoughAssets(
        requiredAssets
      );

      // verify result
      expect(result).to.be.false;
    });

    /**
     * Target: testing hasLockAddressEnoughAssets
     * Dependencies:
     *    KoiosApi
     * Scenario:
     *    Mock KoiosApi getAddressInfo to return test lovelace balance
     *    Mock KoiosApi getAddressAssets to return test assets
     *    Mock required assets
     *    Run test
     *    Check return value.
     * Expected Output:
     *    It should return true
     */
    it('should return true when there is enough ada and assets in address', async () => {
      // mock address info and assets
      mockKoiosGetAddressInfo(
        CardanoConfigs.bankAddress,
        CardanoTestBoxes.mediumLovelaceAddressInfo
      );
      mockKoiosGetAddressAssets(
        CardanoConfigs.bankAddress,
        CardanoTestBoxes.mediumAddressAssets
      );

      // mock required assets
      const multiAsset = MultiAsset.new();
      multiAsset.set_asset(
        ScriptHash.from_hex(
          '22c3b86a5b88a78b5de52f4aed2831d1483b3b7681f1ee2569538130'
        ),
        AssetName.new(Utils.hexStringToUint8Array('1111111111')),
        BigNum.from_str('200000000')
      );
      const requiredAssets: UtxoBoxesAssets = {
        lovelace: BigNum.from_str('100000000'),
        assets: multiAsset,
      };

      // run test
      const result = await CardanoTrack.hasLockAddressEnoughAssets(
        requiredAssets
      );

      // verify result
      expect(result).to.be.true;
    });
  });
});
