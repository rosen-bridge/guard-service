import fs from 'fs';

import { TokenMap } from '@rosen-bridge/tokens';

class TokenHandler {
  private static instance: TokenHandler;
  protected tokenMap: TokenMap;

  private constructor() {
    // do nothing
  }

  /**
   * initializes TokenHandler with tokens from the specified path
   * @param tokensPath path to tokens json file
   */
  static init = async (tokensPath: string): Promise<void> => {
    if (!TokenHandler.instance) {
      if (!fs.existsSync(tokensPath)) {
        throw new Error(`tokensMap file with path ${tokensPath} doesn't exist`);
      }
      TokenHandler.instance = new TokenHandler();
      const tokensJson: string = fs.readFileSync(tokensPath, 'utf8');
      const tokens = JSON.parse(tokensJson).tokens;
      TokenHandler.instance.tokenMap = new TokenMap();
      await TokenHandler.instance.tokenMap.updateConfigByJson(tokens);
    }
  };

  /**
   * returns the TokenHandler instance if initialized
   * @returns TokenHandler instance
   */
  static getInstance = (): TokenHandler => {
    if (!TokenHandler.instance) {
      throw new Error('TokenHandler is not initialized');
    }
    return TokenHandler.instance;
  };

  /**
   * @returns the token map
   */
  getTokenMap = (): TokenMap => {
    return this.tokenMap;
  };
}

export { TokenHandler };
