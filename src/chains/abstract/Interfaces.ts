interface CoveringBoxes {
  covered: boolean;
  boxes: string[];
}

interface TokenInfo {
  id: string;
  value: bigint;
}

interface AssetBalance {
  nativeToken: bigint;
  tokens: TokenInfo[];
}

interface BoxInfo {
  id: string;
  assets: AssetBalance;
}

export { CoveringBoxes, TokenInfo, AssetBalance, BoxInfo };
