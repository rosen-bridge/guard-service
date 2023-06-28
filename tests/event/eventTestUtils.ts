import { EventTrigger } from '@rosen-chains/abstract-chain';

/**
 * creates EventTrigger object
 */
export const createEventTrigger = (
  height: number,
  fromChain: string,
  toChain: string,
  fromAddress: string,
  toAddress: string,
  amount: string,
  bridgeFee: string,
  networkFee: string,
  sourceChainTokenId: string,
  targetChainTokenId: string,
  sourceTxId: string,
  sourceBlockId: string,
  sourceChainHeight: number,
  WIDs: string[]
): EventTrigger => {
  return {
    height: height,
    fromChain: fromChain,
    toChain: toChain,
    fromAddress: fromAddress,
    toAddress: toAddress,
    amount: amount,
    bridgeFee: bridgeFee,
    networkFee: networkFee,
    sourceChainTokenId: sourceChainTokenId,
    targetChainTokenId: targetChainTokenId,
    sourceTxId: sourceTxId,
    sourceBlockId: sourceBlockId,
    sourceChainHeight: sourceChainHeight,
    WIDs: WIDs,
  };
};
