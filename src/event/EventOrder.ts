import {
  AssetBalance,
  EventTrigger,
  PaymentOrder,
  SinglePayment,
  TokenInfo,
} from '@rosen-chains/abstract-chain';
import Utils from '../helpers/Utils';
import { Fee } from '@rosen-bridge/minimum-fee';
import Configs from '../helpers/Configs';
import GuardsErgoConfigs from '../helpers/GuardsErgoConfigs';
import MinimumFee from './MinimumFee';
import { rosenConfig } from '../helpers/RosenConfig';
import { ERG, ERGO_CHAIN } from '@rosen-chains/ergo';

class EventOrder {
  static watcherPermitAddress =
    GuardsErgoConfigs.ergoContractConfig.permitAddress;

  /**
   * generates single payment for an event
   * @param event the event trigger
   * @param chainMinTransfer the minimum native token transfer for target chain
   * @param feeConfig minimum fee and rsn ratio config for the event
   */
  static eventSinglePayment = (
    event: EventTrigger,
    chainMinTransfer: bigint,
    feeConfig: Fee
  ): SinglePayment => {
    const assets: AssetBalance = {
      nativeToken: chainMinTransfer,
      tokens: [],
    };

    // check if targetToken is native token
    const isNativeToken =
      Configs.tokenMap.search(event.toChain, {
        [Configs.tokenMap.getIdKey(event.toChain)]: event.targetChainTokenId,
      })[0][event.toChain].metaData.type === 'native';
    const bridgeFee = Utils.maxBigint(
      Utils.maxBigint(BigInt(event.bridgeFee), feeConfig.bridgeFee),
      (BigInt(event.amount) * feeConfig.feeRatio) /
        MinimumFee.bridgeMinimumFee.feeRatioDivisor
    );
    const networkFee = Utils.maxBigint(
      BigInt(event.networkFee),
      feeConfig.networkFee
    );

    if (isNativeToken) {
      // if targetToken is native token, increase native token amount
      assets.nativeToken += BigInt(event.amount) - bridgeFee - networkFee;
    } else {
      // else, add transferring token
      assets.tokens.push({
        id: event.targetChainTokenId,
        value: BigInt(event.amount) - bridgeFee - networkFee,
      });
    }

    return {
      address: event.toAddress,
      assets: assets,
    };
  };

  /**
   * generates event reward order
   * @param event the event trigger
   * @param unmergedWIDs wid of valid commitment boxes which did not merge into event trigger
   * @param feeConfig minimum fee and rsn ratio config for the event
   * @param paymentTxId payment transaction id (which is empty string when toChain is Ergo)
   * @param rwtTokenId RWT token id of fromChain
   * @param rwtCount amount RWT token per watcher
   */
  static eventRewardOrder = (
    event: EventTrigger,
    unmergedWIDs: string[],
    feeConfig: Fee,
    paymentTxId: string,
    rwtTokenId: string,
    rwtCount: bigint
  ): PaymentOrder => {
    const WIDs: string[] = [...event.WIDs, ...unmergedWIDs];
    const bridgeFee = Utils.maxBigint(
      Utils.maxBigint(BigInt(event.bridgeFee), feeConfig.bridgeFee),
      (BigInt(event.amount) * feeConfig.feeRatio) /
        MinimumFee.bridgeMinimumFee.feeRatioDivisor
    );
    const networkFee = Utils.maxBigint(
      BigInt(event.networkFee),
      feeConfig.networkFee
    );
    const rsnFee =
      (bridgeFee * feeConfig.rsnRatio) /
      MinimumFee.bridgeMinimumFee.ratioDivisor;

    const tokenId = Configs.tokenMap.getID(
      Configs.tokenMap.search(event.fromChain, {
        [Configs.tokenMap.getIdKey(event.fromChain)]: event.sourceChainTokenId,
      })[0],
      ERGO_CHAIN
    );
    if (tokenId === ERG)
      return this.eventErgRewardOrder(
        WIDs,
        bridgeFee,
        networkFee,
        rsnFee,
        paymentTxId,
        rwtTokenId,
        rwtCount
      );
    else
      return this.eventTokenRewardOrder(
        WIDs,
        bridgeFee,
        networkFee,
        rsnFee,
        tokenId,
        paymentTxId,
        rwtTokenId,
        rwtCount
      );
  };

  /**
   * generates erg payment of event reward order
   * @param WIDs list of watcher ids
   * @param bridgeFee event total bridge fee
   * @param networkFee event total network fee
   * @param rsnFee event total RSN fee
   * @param paymentTxId payment transaction id (which is empty string when toChain is Ergo)
   * @param rwtTokenId RWT token id of fromChain
   * @param rwtCount amount RWT token per watcher
   */
  protected static eventErgRewardOrder = (
    WIDs: string[],
    bridgeFee: bigint,
    networkFee: bigint,
    rsnFee: bigint,
    paymentTxId: string,
    rwtTokenId: string,
    rwtCount: bigint
  ): PaymentOrder => {
    const order: PaymentOrder = [];
    const watchersLen = WIDs.length;

    // calculate each watcher share
    const watcherErgAmount =
      (bridgeFee * GuardsErgoConfigs.watchersSharePercent) /
        100n /
        BigInt(watchersLen) +
      GuardsErgoConfigs.minimumErg;
    const watcherRsnAmount =
      (rsnFee * GuardsErgoConfigs.watchersRSNSharePercent) /
      100n /
      BigInt(watchersLen);
    const watcherTokens: TokenInfo[] = [
      {
        id: rwtTokenId,
        value: rwtCount,
      },
    ];
    if (watcherRsnAmount > 0)
      watcherTokens.push({
        id: rosenConfig.RSN,
        value: watcherRsnAmount,
      });

    // add watcher boxes to order
    WIDs.forEach((wid) => {
      const assets: AssetBalance = {
        nativeToken: watcherErgAmount,
        tokens: watcherTokens,
      };
      order.push({
        address: this.watcherPermitAddress,
        assets: assets,
        extra: wid,
      });
    });

    // add guard bridge fee to order
    const guardBridgeFeeErgAmount =
      bridgeFee -
      BigInt(watchersLen) * watcherErgAmount +
      GuardsErgoConfigs.minimumErg;
    const guardRsnAmount = rsnFee - BigInt(watchersLen) * watcherRsnAmount;
    const assets: AssetBalance = {
      nativeToken: guardBridgeFeeErgAmount,
      tokens:
        guardRsnAmount > 0
          ? [
              {
                id: rosenConfig.RSN,
                value: guardRsnAmount,
              },
            ]
          : [],
    };
    order.push({
      address: GuardsErgoConfigs.bridgeFeeRepoAddress,
      assets: assets,
      extra: paymentTxId,
    });

    // add guard network fee to order
    order.push({
      address: GuardsErgoConfigs.networkFeeRepoAddress,
      assets: {
        nativeToken: networkFee + GuardsErgoConfigs.minimumErg,
        tokens: [],
      },
    });

    return order;
  };

  /**
   * generates token payment of event reward order
   * @param WIDs list of watcher ids
   * @param bridgeFee event total bridge fee
   * @param networkFee event total network fee
   * @param rsnFee event total RSN fee
   * @param tokenId payment token id
   * @param paymentTxId payment transaction id (which is empty string when toChain is Ergo)
   * @param rwtTokenId RWT token id of fromChain
   * @param rwtCount amount RWT token per watcher
   */
  protected static eventTokenRewardOrder = (
    WIDs: string[],
    bridgeFee: bigint,
    networkFee: bigint,
    rsnFee: bigint,
    tokenId: string,
    paymentTxId: string,
    rwtTokenId: string,
    rwtCount: bigint
  ): PaymentOrder => {
    const order: PaymentOrder = [];
    const watchersLen = WIDs.length;

    // calculate each watcher share
    const watcherTokenAmount =
      (bridgeFee * GuardsErgoConfigs.watchersSharePercent) /
      100n /
      BigInt(watchersLen);
    const watcherRsnAmount =
      (rsnFee * GuardsErgoConfigs.watchersRSNSharePercent) /
      100n /
      BigInt(watchersLen);
    const watcherTokens: TokenInfo[] = [
      {
        id: rwtTokenId,
        value: rwtCount,
      },
      {
        id: tokenId,
        value: watcherTokenAmount,
      },
    ];
    if (watcherRsnAmount > 0)
      watcherTokens.push({
        id: rosenConfig.RSN,
        value: watcherRsnAmount,
      });

    // add watcher boxes to order
    WIDs.forEach((wid) => {
      order.push({
        address: this.watcherPermitAddress,
        assets: {
          nativeToken: GuardsErgoConfigs.minimumErg,
          tokens: watcherTokens,
        },
        extra: wid,
      });
    });

    // add guard bridge fee to order
    const guardBridgeFeeTokenAmount =
      bridgeFee - BigInt(watchersLen) * watcherTokenAmount;
    const guardRsnAmount = rsnFee - BigInt(watchersLen) * watcherRsnAmount;
    const guardTokens: TokenInfo[] = [
      {
        id: tokenId,
        value: guardBridgeFeeTokenAmount,
      },
    ];
    if (guardRsnAmount > 0)
      guardTokens.push({
        id: rosenConfig.RSN,
        value: guardRsnAmount,
      });
    order.push({
      address: GuardsErgoConfigs.bridgeFeeRepoAddress,
      assets: {
        nativeToken: GuardsErgoConfigs.minimumErg,
        tokens: guardTokens,
      },
      extra: paymentTxId,
    });

    // add guard network fee to order
    order.push({
      address: GuardsErgoConfigs.networkFeeRepoAddress,
      assets: {
        nativeToken: GuardsErgoConfigs.minimumErg,
        tokens: [
          {
            id: tokenId,
            value: networkFee,
          },
        ],
      },
    });

    return order;
  };
}

export default EventOrder;
