import fs from 'fs';
import { RosenTokens, TokenMap } from '@rosen-bridge/tokens';

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
      const tokens = JSON.parse(tokensJson);
      const transformedTokens = TokenHandler.instance.transformTokens(tokens);
      TokenHandler.instance.tokenMap = new TokenMap();
      await TokenHandler.instance.tokenMap.updateConfigByJson(
        transformedTokens
      );
    }
  };

  /**
   * Transforms the tokens to a new format
   * @param tokens the tokens to transform
   * @returns the transformed tokens
   */
  private transformTokens = (tokens: any): RosenTokens => {
    return tokens.tokens.map((token: any) => {
      const transformedToken: any = {};

      // Get all chain keys (ergo, cardano, ethereum, etc.)
      const chains = Object.keys(token);

      // For each chain in the token
      for (const chain of chains) {
        transformedToken[chain] = {
          ...token[chain],
          ...token[chain].metaData,
        };
        // Delete the metaData object since it's now flattened
        delete transformedToken[chain].metaData;
      }

      return transformedToken;
    });
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
   * @returns whether TokenHandler is initialized
   */
  static isInitialized = (): boolean => {
    return !!TokenHandler.instance;
  };

  /**
   * @returns the token map
   */
  getTokenMap = (): TokenMap => {
    return this.tokenMap;
  };
}

export { TokenHandler };
