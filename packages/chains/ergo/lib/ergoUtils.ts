import { ErgoBox, ErgoBoxCandidate } from 'ergo-lib-wasm-nodejs';
import { AssetBalance, TokenInfo } from '@rosen-chains/abstract-chain';

class ErgoUtils {
  /**
   * gets Ergo box assets
   * @param box the Ergo box
   */
  static getBoxAssets = (box: ErgoBoxCandidate | ErgoBox): AssetBalance => {
    const tokens: Array<TokenInfo> = [];
    for (let i = 0; i < box.tokens().len(); i++) {
      const token = box.tokens().get(i);
      tokens.push({
        id: token.id().to_str(),
        value: BigInt(token.amount().as_i64().to_str()),
      });
    }

    // get box id and return box info
    return {
      nativeToken: BigInt(box.value().as_i64().to_str()),
      tokens: tokens,
    };
  };
}

export default ErgoUtils;
