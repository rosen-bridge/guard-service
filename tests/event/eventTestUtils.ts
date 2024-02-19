import { EventTrigger } from '@rosen-chains/abstract-chain';
import TestUtils from '../testUtils/TestUtils';
import { blake2b } from 'blakejs';

export type TestEventTrigger = {
  event: EventTrigger;
  WIDs: string[];
};

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
  WIDsCount = 5,
  WIDs?: string[]
): TestEventTrigger => {
  const eventWIDs = WIDs
    ? WIDs
    : Array(WIDsCount)
        .fill(0)
        .map(() => TestUtils.generateRandomId());
  const WIDsHash = Buffer.from(
    blake2b(eventWIDs.join(''), undefined, 32)
  ).toString('hex');

  const event: EventTrigger = {
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
    WIDsHash: WIDsHash,
    WIDsCount: WIDsCount,
  };
  return {
    event: event,
    WIDs: eventWIDs,
  };
};
