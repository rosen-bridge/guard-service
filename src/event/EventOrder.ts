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
import ErgoConfigs from '../helpers/ErgoConfigs';
import MinimumFee from './MinimumFee';
import { rosenConfig } from '../helpers/RosenConfig';
import { ERG, ERGO_CHAIN } from '@rosen-chains/ergo';

class EventOrder {
  static watcherPermitAddress = ErgoConfigs.ergoContractConfig.permitAddress;

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

    if (isNativeToken) {
      // if targetToken is native token, increase native token amount
      assets.nativeToken +=
        BigInt(event.amount) -
        Utils.maxBigint(
          Utils.maxBigint(BigInt(event.bridgeFee), feeConfig.bridgeFee),
          (BigInt(event.amount) * feeConfig.feeRatio) /
            MinimumFee.bridgeMinimumFee.feeRatioDivisor
        ) -
        Utils.maxBigint(BigInt(event.networkFee), feeConfig.networkFee);
    } else {
      // else, add transferring token
      assets.tokens.push({
        id: event.targetChainTokenId,
        value:
          BigInt(event.amount) -
          Utils.maxBigint(
            Utils.maxBigint(BigInt(event.bridgeFee), feeConfig.bridgeFee),
            (BigInt(event.amount) * feeConfig.feeRatio) /
              MinimumFee.bridgeMinimumFee.feeRatioDivisor
          ) -
          Utils.maxBigint(BigInt(event.networkFee), feeConfig.networkFee),
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
   */
  static eventRewardOrder = (
    event: EventTrigger,
    unmergedWIDs: string[],
    feeConfig: Fee,
    paymentTxId: string
  ): PaymentOrder => {
    const WIDs: string[] = [...event.WIDs, ...unmergedWIDs];
    const bridgeFee = Utils.maxBigint(
      BigInt(event.bridgeFee),
      feeConfig.bridgeFee
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
        paymentTxId
      );
    else
      return this.eventTokenRewardOrder(
        WIDs,
        bridgeFee,
        networkFee,
        rsnFee,
        tokenId,
        paymentTxId
      );
  };

  /**
   * generates erg payment of event reward order
   * @param WIDs list of watcher ids
   * @param bridgeFee event total bridge fee
   * @param networkFee event total network fee
   * @param rsnFee event total RSN fee
   * @param paymentTxId payment transaction id (which is empty string when toChain is Ergo)
   */
  protected static eventErgRewardOrder = (
    WIDs: string[],
    bridgeFee: bigint,
    networkFee: bigint,
    rsnFee: bigint,
    paymentTxId: string
  ): PaymentOrder => {
    const order: PaymentOrder = [];
    const watchersLen = WIDs.length;

    // calculate each watcher share
    const watcherErgAmount =
      (bridgeFee * ErgoConfigs.watchersSharePercent) /
        100n /
        BigInt(watchersLen) +
      ErgoConfigs.minimumErg;
    const watcherRsnAmount =
      (rsnFee * ErgoConfigs.watchersRSNSharePercent) /
      100n /
      BigInt(watchersLen);

    // add watcher boxes to order
    WIDs.forEach((wid) => {
      const assets: AssetBalance = {
        nativeToken: watcherErgAmount,
        tokens:
          watcherRsnAmount > 0
            ? [
                {
                  id: rosenConfig.RSN,
                  value: watcherRsnAmount,
                },
              ]
            : [],
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
      ErgoConfigs.minimumErg;
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
      address: ErgoConfigs.bridgeFeeRepoAddress,
      assets: assets,
      extra: paymentTxId,
    });

    // add guard network fee to order
    order.push({
      address: ErgoConfigs.networkFeeRepoAddress,
      assets: {
        nativeToken: networkFee,
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
   */
  protected static eventTokenRewardOrder = (
    WIDs: string[],
    bridgeFee: bigint,
    networkFee: bigint,
    rsnFee: bigint,
    tokenId: string,
    paymentTxId: string
  ): PaymentOrder => {
    const order: PaymentOrder = [];
    const watchersLen = WIDs.length;

    // calculate each watcher share
    const watcherTokenAmount =
      (bridgeFee * ErgoConfigs.watchersSharePercent) /
      100n /
      BigInt(watchersLen);
    const watcherRsnAmount =
      (rsnFee * ErgoConfigs.watchersRSNSharePercent) /
      100n /
      BigInt(watchersLen);
    const watcherTokens: TokenInfo[] = [
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
          nativeToken: ErgoConfigs.minimumErg,
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
      address: ErgoConfigs.bridgeFeeRepoAddress,
      assets: {
        nativeToken: ErgoConfigs.minimumErg,
        tokens: guardTokens,
      },
      extra: paymentTxId,
    });

    // add guard network fee to order
    order.push({
      address: ErgoConfigs.networkFeeRepoAddress,
      assets: {
        nativeToken: ErgoConfigs.minimumErg,
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
