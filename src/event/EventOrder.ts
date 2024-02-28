import {
  AssetBalance,
  EventTrigger,
  PaymentOrder,
  SinglePayment,
  TokenInfo,
} from '@rosen-chains/abstract-chain';
import Utils from '../utils/Utils';
import { Fee } from '@rosen-bridge/minimum-fee';
import Configs from '../configs/Configs';
import GuardsErgoConfigs from '../configs/GuardsErgoConfigs';
import MinimumFee from './MinimumFee';
import { rosenConfig } from '../configs/RosenConfig';
import { ERG, ERGO_CHAIN, ErgoChain } from '@rosen-chains/ergo';
import ChainHandler from '../handlers/ChainHandler';
import EventBoxes from './EventBoxes';
import { PermitBoxValue } from './types';

class EventOrder {
  /**
   * generates user payment order for an event
   * @param event the event trigger
   * @param feeConfig minimum fee and rsn ratio config for the event
   */
  static createEventPaymentOrder = async (
    event: EventTrigger,
    feeConfig: Fee
  ): Promise<PaymentOrder> => {
    const targetChain = ChainHandler.getInstance().getChain(event.toChain);
    const chainMinTransfer = targetChain.getMinimumNativeToken();

    const order: PaymentOrder = [];

    // add reward order if target chain is ergo
    if (event.toChain === ERGO_CHAIN) {
      const ergoChain = targetChain as ErgoChain;

      // get event and commitment boxes
      const eventBox = await EventBoxes.getEventBox(event);
      const rwtCount =
        ergoChain.getBoxRWT(eventBox) / BigInt(event.WIDs.length);
      const permitValue =
        ergoChain.getSerializedBoxInfo(eventBox).assets.nativeToken /
        BigInt(event.WIDs.length);

      const commitmentBoxes = await EventBoxes.getEventValidCommitments(
        event,
        rwtCount
      );

      // generate reward order
      const rewardOrder = this.eventRewardOrder(
        event,
        commitmentBoxes.map((commitment) => ({
          wid: ergoChain.getBoxWID(commitment),
          boxValue:
            ergoChain.getSerializedBoxInfo(commitment).assets.nativeToken,
        })),
        feeConfig,
        '',
        ChainHandler.getInstance().getChain(event.fromChain).getRWTToken(),
        rwtCount,
        permitValue
      );
      order.push(...rewardOrder);
    }

    // add payment order
    const paymentRecord = this.eventSinglePayment(
      event,
      chainMinTransfer,
      feeConfig
    );
    order.push(paymentRecord);

    return order;
  };

  /**
   * generates reward distribution order for an event
   * @param event the event trigger
   * @param feeConfig minimum fee and rsn ratio config for the event
   * @param paymentTxId the payment transaction of the event
   */
  static createEventRewardOrder = async (
    event: EventTrigger,
    feeConfig: Fee,
    paymentTxId: string
  ): Promise<PaymentOrder> => {
    const ergoChain = ChainHandler.getInstance().getErgoChain();

    // get event and commitment boxes
    const eventBox = await EventBoxes.getEventBox(event);
    const rwtCount = ergoChain.getBoxRWT(eventBox) / BigInt(event.WIDs.length);
    const permitValue =
      ergoChain.getSerializedBoxInfo(eventBox).assets.nativeToken /
      BigInt(event.WIDs.length);

    const commitmentBoxes = await EventBoxes.getEventValidCommitments(
      event,
      rwtCount
    );

    // generate reward order
    return EventOrder.eventRewardOrder(
      event,
      commitmentBoxes.map((commitment) => ({
        wid: ergoChain.getBoxWID(commitment),
        boxValue: ergoChain.getSerializedBoxInfo(commitment).assets.nativeToken,
      })),
      feeConfig,
      paymentTxId,
      ChainHandler.getInstance().getChain(event.fromChain).getRWTToken(),
      rwtCount,
      permitValue
    );
  };

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
    console.log(event.toChain);
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
    if (event.toChain === ERGO_CHAIN) {
      assets.nativeToken += GuardsErgoConfigs.additionalErgOnPayment;
    }

    return {
      address: event.toAddress,
      assets: assets,
    };
  };

  /**
   * generates event reward order
   * @param event the event trigger
   * @param unmergedWIDs wid of valid commitment boxes which did not merge into event trigger with the boxValue
   * @param feeConfig minimum fee and rsn ratio config for the event
   * @param paymentTxId payment transaction id (which is empty string when toChain is Ergo)
   * @param rwtTokenId RWT token id of fromChain
   * @param rwtCount amount RWT token per watcher
   * @param permitValue erg amount to use in permit box per watcher
   */
  static eventRewardOrder = (
    event: EventTrigger,
    unmergedWIDs: PermitBoxValue[],
    feeConfig: Fee,
    paymentTxId: string,
    rwtTokenId: string,
    rwtCount: bigint,
    permitValue: bigint
  ): PaymentOrder => {
    const outPermits: PermitBoxValue[] = [
      ...event.WIDs.map((wid) => ({ wid, boxValue: permitValue })),
      ...unmergedWIDs,
    ];
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
    const permitAddress = ChainHandler.getInstance()
      .getChain(event.fromChain)
      .getChainConfigs().addresses.permit;
    if (tokenId === ERG)
      return this.eventErgRewardOrder(
        outPermits,
        bridgeFee,
        networkFee,
        rsnFee,
        paymentTxId,
        rwtTokenId,
        rwtCount,
        permitAddress
      );
    else
      return this.eventTokenRewardOrder(
        outPermits,
        bridgeFee,
        networkFee,
        rsnFee,
        tokenId,
        paymentTxId,
        rwtTokenId,
        rwtCount,
        permitAddress
      );
  };

  /**
   * generates erg payment of event reward order
   * @param outPermits list of watcher permit wid and box values
   * @param bridgeFee event total bridge fee
   * @param networkFee event total network fee
   * @param rsnFee event total RSN fee
   * @param paymentTxId payment transaction id (which is empty string when toChain is Ergo)
   * @param rwtTokenId RWT token id of fromChain
   * @param rwtCount amount RWT token per watcher
   * @param permitAddress
   */
  protected static eventErgRewardOrder = (
    outPermits: PermitBoxValue[],
    bridgeFee: bigint,
    networkFee: bigint,
    rsnFee: bigint,
    paymentTxId: string,
    rwtTokenId: string,
    rwtCount: bigint,
    permitAddress: string
  ): PaymentOrder => {
    const order: PaymentOrder = [];
    const watchersLen = outPermits.length;

    // calculate each watcher share
    const watcherErgAmount =
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
    ];
    if (watcherRsnAmount > 0)
      watcherTokens.push({
        id: rosenConfig.RSN,
        value: watcherRsnAmount,
      });

    // add watcher boxes to order
    outPermits.forEach((permit) => {
      const assets: AssetBalance = {
        nativeToken: watcherErgAmount + permit.boxValue,
        tokens: watcherTokens,
      };
      order.push({
        address: permitAddress,
        assets: assets,
        extra: permit.wid,
      });
    });

    // add guard bridge fee to order
    const guardBridgeFeeErgAmount =
      bridgeFee -
      BigInt(watchersLen) * watcherErgAmount +
      GuardsErgoConfigs.minimumErg;
    const assets: AssetBalance = {
      nativeToken: guardBridgeFeeErgAmount,
      tokens: [],
    };
    order.push({
      address: GuardsErgoConfigs.bridgeFeeRepoAddress,
      assets: assets,
      extra: paymentTxId,
    });

    // add RSN emission to order
    const rsnEmissionAmount = rsnFee - BigInt(watchersLen) * watcherRsnAmount;
    if (rsnEmissionAmount > 0) {
      order.push({
        address: GuardsErgoConfigs.rsnEmissionAddress,
        assets: {
          nativeToken: GuardsErgoConfigs.minimumErg,
          tokens: [
            {
              id: rosenConfig.RSN,
              value: rsnEmissionAmount,
            },
          ],
        },
      });
    }

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
   * @param outPermits list of watcher permit wid and box values
   * @param bridgeFee event total bridge fee
   * @param networkFee event total network fee
   * @param rsnFee event total RSN fee
   * @param tokenId payment token id
   * @param paymentTxId payment transaction id (which is empty string when toChain is Ergo)
   * @param rwtTokenId RWT token id of fromChain
   * @param rwtCount amount RWT token per watcher
   * @param permitAddress
   */
  protected static eventTokenRewardOrder = (
    outPermits: PermitBoxValue[],
    bridgeFee: bigint,
    networkFee: bigint,
    rsnFee: bigint,
    tokenId: string,
    paymentTxId: string,
    rwtTokenId: string,
    rwtCount: bigint,
    permitAddress: string
  ): PaymentOrder => {
    const order: PaymentOrder = [];
    const watchersLen = outPermits.length;

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
    ];
    if (watcherTokenAmount > 0)
      watcherTokens.push({
        id: tokenId,
        value: watcherTokenAmount,
      });
    if (watcherRsnAmount > 0)
      watcherTokens.push({
        id: rosenConfig.RSN,
        value: watcherRsnAmount,
      });

    // add watcher boxes to order
    outPermits.forEach((permit) => {
      order.push({
        address: permitAddress,
        assets: {
          nativeToken: permit.boxValue,
          tokens: watcherTokens,
        },
        extra: permit.wid,
      });
    });

    // add guard bridge fee to order
    const guardBridgeFeeTokenAmount =
      bridgeFee - BigInt(watchersLen) * watcherTokenAmount;
    const guardTokens: TokenInfo[] =
      guardBridgeFeeTokenAmount > 0
        ? [
            {
              id: tokenId,
              value: guardBridgeFeeTokenAmount,
            },
          ]
        : [];
    order.push({
      address: GuardsErgoConfigs.bridgeFeeRepoAddress,
      assets: {
        nativeToken: GuardsErgoConfigs.minimumErg,
        tokens: guardTokens,
      },
      extra: paymentTxId,
    });

    // add RSN emission to order
    const rsnEmissionAmount = rsnFee - BigInt(watchersLen) * watcherRsnAmount;
    if (rsnEmissionAmount > 0) {
      order.push({
        address: GuardsErgoConfigs.rsnEmissionAddress,
        assets: {
          nativeToken: GuardsErgoConfigs.minimumErg,
          tokens: [
            {
              id: rosenConfig.RSN,
              value: rsnEmissionAmount,
            },
          ],
        },
      });
    }

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
