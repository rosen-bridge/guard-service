import AbstractChain from './AbstractChain';
import AbstractUtxoChainNetwork from './network/AbstractUtxoChainNetwork';
import { AssetBalance, BoxInfo, CoveringBoxes } from './Interfaces';
import ChainsConstants from '../ChainsConstants';

abstract class AbstractUtxoChain extends AbstractChain {
  declare network: AbstractUtxoChainNetwork;

  /**
   * extracts box id and assets of a box
   * @param serializedBox the serialized string of the box
   * @returns an object containing the box id and assets
   */
  abstract getBoxIdAndAssets: (serializedBox: string) => BoxInfo;

  /**
   * gets useful, allowable and last boxes for an address until required assets are satisfied
   * @param address the address
   * @param requiredAssets the required assets
   * @param unallowableBoxIds the id of unallowable boxes
   * @param trackMap the mapping of a box id to it's next box
   * @returns an object containing the selected boxes with a boolean showing if requirements covered or not
   */
  getCoveringBoxes = (
    // TODO: implement unit tests for this function
    address: string,
    requiredAssets: AssetBalance,
    unallowableBoxIds: string[],
    trackMap: Map<string, string>
  ): CoveringBoxes => {
    let unCoveredNativeToken = requiredAssets.nativeToken;
    const unCoveredTokens = requiredAssets.tokens.filter(
      (info) => info.value > 0n
    );

    const remaining = () => {
      return unCoveredTokens.length > 0 || unCoveredNativeToken > 0n;
    };

    let offset = 0;
    const result: string[] = [];

    // get boxes until requirements are satisfied
    while (remaining()) {
      const boxes = this.network.getAddressBoxes(
        address,
        offset,
        ChainsConstants.GET_BOX_API_LIMIT
      );
      offset += ChainsConstants.GET_BOX_API_LIMIT;

      // process received boxes
      for (const box of boxes) {
        let trackedBox = box;
        let boxInfo = this.getBoxIdAndAssets(box);

        // track boxes
        while (trackMap.has(boxInfo.id)) {
          trackedBox = trackMap.get(boxInfo.id)!;
          boxInfo = this.getBoxIdAndAssets(trackedBox);
        }

        // exclude unallowable boxes
        if (boxInfo.id in unallowableBoxIds) continue;

        // check and add if box assets are useful to requirements
        let isUseful = false;
        boxInfo.assets.tokens.forEach((boxToken) => {
          const tokenIndex = unCoveredTokens.findIndex(
            (requiredToken) => requiredToken.id === boxToken.id
          );
          if (tokenIndex !== -1) {
            isUseful = true;
            const token = unCoveredTokens[tokenIndex];
            if (token.value > boxToken.value) token.value -= boxToken.value;
            else unCoveredTokens.splice(tokenIndex, 1);
          }
        });
        if (isUseful || unCoveredNativeToken > 0n) {
          unCoveredNativeToken -=
            unCoveredNativeToken >= boxInfo.assets.nativeToken
              ? boxInfo.assets.nativeToken
              : 0n;
          result.push(trackedBox);
        }

        // end process if requirements are satisfied
        if (!remaining()) break;
      }
    }

    return {
      covered: !remaining(),
      boxes: result,
    };
  };
}

export default AbstractUtxoChain;
