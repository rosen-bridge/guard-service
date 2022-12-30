import {Utxo, UtxoBoxesAssets} from "../../../src/chains/cardano/models/Interfaces";
import TestBoxes from "./testUtils/TestBoxes";
import {AssetName, Assets, BigNum, MultiAsset, ScriptHash} from "@emurgo/cardano-serialization-lib-nodejs";
import CardanoUtils from "../../../src/chains/cardano/helpers/CardanoUtils";
import {Buffer} from "buffer";
import Utils from "../../../src/helpers/Utils";
import {expect} from "chai";

describe('CardanoUtils' , () => {
    describe('getCoveringUtxo', () => {
        // mock getting bankBoxes
        const bankBoxes: Utxo[] = TestBoxes.mockBankBoxes();
        const requiredAssets: UtxoBoxesAssets = {
            lovelace: BigNum.from_str('111300000'),
            assets: MultiAsset.new(),
        };
        const paymentAssetInfo = CardanoUtils.getCardanoAssetInfo(
            'asset1nl000000000000000000000000000000000000'
        );
        const policyId = ScriptHash.from_bytes(
            Buffer.from(Utils.Uint8ArrayToHexString(paymentAssetInfo.policyId), 'hex')
        );
        const assetName = AssetName.new(
            Buffer.from(
                Utils.Uint8ArrayToHexString(paymentAssetInfo.assetName),
                'hex'
            )
        );

        /**
         * Target: testing getCoveringUtxo
         * Dependencies:
         *    CardanoUtils
         * Expected Output:
         *    The function should return 1 specific box
         */
        it('should return 1 boxes for ADA payment', async () => {
            const requiredAssets: UtxoBoxesAssets = {
                lovelace: BigNum.from_str('100000000'),
                assets: MultiAsset.new(),
            };

            // run test
            const boxes = CardanoUtils.getCoveringUtxo(
                [bankBoxes[5], bankBoxes[4]],
                requiredAssets
            );

            // verify output boxes
            expect(boxes.length).greaterThanOrEqual(1);
        });

        /**
         * Target: testing getCoveringUtxo
         * Dependencies:
         *    CardanoUtils
         * Expected Output:
         *    The function should return 2 specific box
         */
        it('should return 2 boxes for ADA payment', async () => {
            // mock ada payment event
            const requiredAssets: UtxoBoxesAssets = {
                lovelace: BigNum.from_str('111300000'),
                assets: MultiAsset.new(),
            };

            // run test
            const boxes = CardanoUtils.getCoveringUtxo(
                [bankBoxes[5], bankBoxes[1]],
                requiredAssets
            );

            // verify output boxes
            expect(boxes.length).to.equal(2);
        });

        /**
         * Target: testing getCoveringUtxo
         * Dependencies:
         *    CardanoUtils
         * Expected Output:
         *    The function should return more than or equal 1 box
         */
        it('should return more than or equal 1 box', async () => {
            const assetList = Assets.new();
            assetList.insert(assetName, BigNum.from_str('50'));
            requiredAssets.assets.insert(policyId, assetList);

            // run test
            const boxes = CardanoUtils.getCoveringUtxo(bankBoxes, requiredAssets);

            // verify output boxes
            expect(boxes.length).to.greaterThanOrEqual(1);
        });

        /**
         * Target: testing getCoveringUtxo
         * Dependencies:
         *    CardanoUtils
         * Expected Output:
         *    The function should return 3 box
         */
        it('should return 2 box for asset payment', async () => {
            const assetList = Assets.new();
            assetList.insert(assetName, BigNum.from_str('60'));
            requiredAssets.assets.insert(policyId, assetList);
            requiredAssets.lovelace = BigNum.zero();

            // run test
            const boxes = CardanoUtils.getCoveringUtxo(
                [bankBoxes[8], bankBoxes[6], bankBoxes[5]],
                requiredAssets
            );

            // verify output boxes
            expect(boxes.length).to.be.equal(2);
        });

        /**
         * Target: testing getCoveringUtxo
         * Dependencies:
         *    CardanoUtils
         * Expected Output:
         *    The function should return 2 box
         */
        it('should return 1 box for asset payment', async () => {
            const assetList = Assets.new();
            assetList.insert(assetName, BigNum.from_str('20'));
            requiredAssets.assets.insert(policyId, assetList);

            // run test
            const boxes = CardanoUtils.getCoveringUtxo(
                [bankBoxes[6], bankBoxes[5]],
                requiredAssets
            );

            // verify output boxes
            expect(boxes.length).to.be.equal(1);
        });
    });
})
