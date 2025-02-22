import {
  AssetBalance,
  EventTrigger,
  PaymentOrder,
  SinglePayment,
  TokenInfo,
} from '@rosen-chains/abstract-chain';
import Utils from '../utils/Utils';
import { ChainMinimumFee } from '@rosen-bridge/minimum-fee';
import GuardsErgoConfigs from '../configs/GuardsErgoConfigs';
import { ERG, ERGO_CHAIN, ErgoChain } from '@rosen-chains/ergo';
import ChainHandler from '../handlers/ChainHandler';
import EventBoxes from './EventBoxes';
import { PermitBoxValue, RewardOrder } from './types';
import { TokensConfig } from '../configs/tokensConfig';

class EventOrder {
  /**
   * generates user payment order for an event
   * @param event the event trigger
   * @param feeConfig minimum fee and rsn ratio config for the event
   * @param eventWIDs WID of commitments that are merged into the event trigger
   */
  static createEventPaymentOrder = async (
    event: EventTrigger,
    feeConfig: ChainMinimumFee,
    eventWIDs: string[]
  ): Promise<PaymentOrder> => {
    const targetChain = ChainHandler.getInstance().getChain(event.toChain);
    const chainMinTransfer = targetChain.getMinimumNativeToken();

    const rewardOrder: RewardOrder = {
      watchersOrder: [],
      guardsOrder: [],
    };

    // add reward order if target chain is ergo
    if (event.toChain === ERGO_CHAIN) {
      const ergoChain = targetChain as ErgoChain;

      // get event and commitment boxes
      const eventBox = await EventBoxes.getEventBox(event);
      const rwtTokenId = ChainHandler.getInstance()
        .getChain(event.fromChain)
        .getRWTToken();
      const rwtCount = ergoChain.getBoxRWT(eventBox) / BigInt(event.WIDsCount);
      const permitValue =
        ergoChain.getSerializedBoxInfo(eventBox).assets.nativeToken /
        BigInt(event.WIDsCount);

      const commitmentBoxes = await EventBoxes.getEventValidCommitments(
        event,
        rwtCount,
        eventWIDs
      );

      // generate reward order
      const order = this.eventRewardOrder(
        event,
        commitmentBoxes.map((commitment) => ({
          wid: ergoChain.getBoxWID(commitment),
          boxValue:
            ergoChain.getSerializedBoxInfo(commitment).assets.nativeToken,
        })),
        feeConfig,
        '',
        rwtTokenId,
        rwtCount,
        permitValue,
        eventWIDs
      );
      rewardOrder.watchersOrder = order.watchersOrder;
      rewardOrder.guardsOrder = order.guardsOrder;
    }

    // add payment order
    const paymentRecord = this.eventSinglePayment(
      event,
      chainMinTransfer,
      feeConfig
    );

    return [
      ...rewardOrder.watchersOrder,
      paymentRecord,
      ...rewardOrder.guardsOrder,
    ];
  };

  /**
   * generates reward distribution order for an event
   * @param event the event trigger
   * @param feeConfig minimum fee and rsn ratio config for the event
   * @param paymentTxId the payment transaction of the event
   * @param eventWIDs WID of commitments that are merged into the event trigger
   */
  static createEventRewardOrder = async (
    event: EventTrigger,
    feeConfig: ChainMinimumFee,
    paymentTxId: string,
    eventWIDs: string[]
  ): Promise<PaymentOrder> => {
    const ergoChain = ChainHandler.getInstance().getErgoChain();

    // get event and commitment boxes
    const eventBox = await EventBoxes.getEventBox(event);
    const rwtTokenId = ChainHandler.getInstance()
      .getChain(event.fromChain)
      .getRWTToken();
    const rwtCount = ergoChain.getBoxRWT(eventBox) / BigInt(event.WIDsCount);
    const permitValue =
      ergoChain.getSerializedBoxInfo(eventBox).assets.nativeToken /
      BigInt(event.WIDsCount);

    const commitmentBoxes = await EventBoxes.getEventValidCommitments(
      event,
      rwtCount,
      eventWIDs
    );

    // generate reward order
    const rewardOrder = EventOrder.eventRewardOrder(
      event,
      commitmentBoxes.map((commitment) => ({
        wid: ergoChain.getBoxWID(commitment),
        boxValue: ergoChain.getSerializedBoxInfo(commitment).assets.nativeToken,
      })),
      feeConfig,
      paymentTxId,
      rwtTokenId,
      rwtCount,
      permitValue,
      eventWIDs
    );
    return [...rewardOrder.watchersOrder, ...rewardOrder.guardsOrder];
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
    feeConfig: ChainMinimumFee
  ): SinglePayment => {
    const assets: AssetBalance = {
      nativeToken: chainMinTransfer,
      tokens: [],
    };

    // check if targetToken is native token
    const isNativeToken =
      TokensConfig.getInstance().getTokenMap().search(event.toChain, {
        tokenId: event.targetChainTokenId,
      })[0][event.toChain].type === 'native';
    const bridgeFee = Utils.maxBigint(
      Utils.maxBigint(BigInt(event.bridgeFee), feeConfig.bridgeFee),
      (BigInt(event.amount) * feeConfig.feeRatio) / feeConfig.feeRatioDivisor
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
      assets.nativeToken += TokensConfig.getInstance()
        .getTokenMap()
        .wrapAmount(
          ERG,
          GuardsErgoConfigs.additionalErgOnPayment,
          ERGO_CHAIN
        ).amount;
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
   * @param eventWIDs WID of commitments that are merged into the event trigger
   */
  static eventRewardOrder = (
    event: EventTrigger,
    unmergedWIDs: PermitBoxValue[],
    feeConfig: ChainMinimumFee,
    paymentTxId: string,
    rwtTokenId: string,
    rwtCount: bigint,
    permitValue: bigint,
    eventWIDs: string[]
  ): RewardOrder => {
    const outPermits: PermitBoxValue[] = [
      ...eventWIDs.map((wid) => ({ wid, boxValue: permitValue })),
      ...unmergedWIDs,
    ];
    const bridgeFee = Utils.maxBigint(
      Utils.maxBigint(BigInt(event.bridgeFee), feeConfig.bridgeFee),
      (BigInt(event.amount) * feeConfig.feeRatio) / feeConfig.feeRatioDivisor
    );
    const networkFee = Utils.maxBigint(
      BigInt(event.networkFee),
      feeConfig.networkFee
    );
    const emissionFee =
      (bridgeFee * feeConfig.rsnRatio) / feeConfig.rsnRatioDivisor;

    const tokenId = TokensConfig.getInstance()
      .getTokenMap()
      .getID(
        TokensConfig.getInstance().getTokenMap().search(event.fromChain, {
          tokenId: event.sourceChainTokenId,
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
        emissionFee,
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
        emissionFee,
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
   * @param emissionFee event total bridge fee in emission token currency
   * @param paymentTxId payment transaction id (which is empty string when toChain is Ergo)
   * @param rwtTokenId RWT token id of fromChain
   * @param rwtCount amount RWT token per watcher
   * @param permitAddress
   */
  protected static eventErgRewardOrder = (
    outPermits: PermitBoxValue[],
    bridgeFee: bigint,
    networkFee: bigint,
    emissionFee: bigint,
    paymentTxId: string,
    rwtTokenId: string,
    rwtCount: bigint,
    permitAddress: string
  ): RewardOrder => {
    const watchersOrder: PaymentOrder = [];
    const guardsOrder: PaymentOrder = [];
    const watchersLen = outPermits.length;

    // calculate each watcher share
    const watcherErgAmount =
      (bridgeFee * GuardsErgoConfigs.watchersSharePercent) /
      100n /
      BigInt(watchersLen);
    const watcherEmissionAmount =
      (emissionFee * GuardsErgoConfigs.watchersEmissionSharePercent) /
      100n /
      BigInt(watchersLen);
    const watcherTokens: TokenInfo[] = [
      {
        id: rwtTokenId,
        value: rwtCount,
      },
    ];
    if (watcherEmissionAmount > 0)
      watcherTokens.push({
        id: GuardsErgoConfigs.emissionTokenId,
        value: watcherEmissionAmount,
      });

    // add watcher boxes to order
    outPermits.forEach((permit) => {
      const assets: AssetBalance = {
        nativeToken: watcherErgAmount + permit.boxValue,
        tokens: watcherTokens,
      };
      watchersOrder.push({
        address: permitAddress,
        assets: assets,
        extra: permit.wid,
      });
    });

    // add guard bridge fee to order
    const minimumErg = TokensConfig.getInstance()
      .getTokenMap()
      .wrapAmount(ERG, GuardsErgoConfigs.minimumErg, ERGO_CHAIN).amount;
    const guardBridgeFeeErgAmount =
      bridgeFee - BigInt(watchersLen) * watcherErgAmount + minimumErg;
    const assets: AssetBalance = {
      nativeToken: guardBridgeFeeErgAmount,
      tokens: [],
    };
    guardsOrder.push({
      address: GuardsErgoConfigs.bridgeFeeRepoAddress,
      assets: assets,
      extra: Buffer.from(paymentTxId).toString('hex'),
    });

    // add emission to order
    const emissionAmount =
      emissionFee - BigInt(watchersLen) * watcherEmissionAmount;
    if (emissionAmount > 0) {
      guardsOrder.push({
        address: GuardsErgoConfigs.emissionAddress,
        assets: {
          nativeToken: minimumErg,
          tokens: [
            {
              id: GuardsErgoConfigs.emissionTokenId,
              value: emissionAmount,
            },
          ],
        },
      });
    }

    // add guard network fee to order
    guardsOrder.push({
      address: GuardsErgoConfigs.networkFeeRepoAddress,
      assets: {
        nativeToken: networkFee + minimumErg,
        tokens: [],
      },
    });

    return { watchersOrder, guardsOrder };
  };

  /**
   * generates token payment of event reward order
   * @param outPermits list of watcher permit wid and box values
   * @param bridgeFee event total bridge fee
   * @param networkFee event total network fee
   * @param emissionFee event total bridge fee in emission token currency
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
    emissionFee: bigint,
    tokenId: string,
    paymentTxId: string,
    rwtTokenId: string,
    rwtCount: bigint,
    permitAddress: string
  ): RewardOrder => {
    const watchersOrder: PaymentOrder = [];
    const guardsOrder: PaymentOrder = [];
    const watchersLen = outPermits.length;

    // calculate each watcher share
    const watcherTokenAmount =
      (bridgeFee * GuardsErgoConfigs.watchersSharePercent) /
      100n /
      BigInt(watchersLen);
    const watcherEmissionAmount =
      (emissionFee * GuardsErgoConfigs.watchersEmissionSharePercent) /
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
    if (watcherEmissionAmount > 0)
      watcherTokens.push({
        id: GuardsErgoConfigs.emissionTokenId,
        value: watcherEmissionAmount,
      });

    // add watcher boxes to order
    outPermits.forEach((permit) => {
      watchersOrder.push({
        address: permitAddress,
        assets: {
          nativeToken: permit.boxValue,
          tokens: watcherTokens,
        },
        extra: permit.wid,
      });
    });

    // add guard bridge fee to order
    const minimumErg = TokensConfig.getInstance()
      .getTokenMap()
      .wrapAmount(ERG, GuardsErgoConfigs.minimumErg, ERGO_CHAIN).amount;
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
    guardsOrder.push({
      address: GuardsErgoConfigs.bridgeFeeRepoAddress,
      assets: {
        nativeToken: minimumErg,
        tokens: guardTokens,
      },
      extra: Buffer.from(paymentTxId).toString('hex'),
    });

    // add emission to order
    const emissionAmount =
      emissionFee - BigInt(watchersLen) * watcherEmissionAmount;
    if (emissionAmount > 0) {
      guardsOrder.push({
        address: GuardsErgoConfigs.emissionAddress,
        assets: {
          nativeToken: minimumErg,
          tokens: [
            {
              id: GuardsErgoConfigs.emissionTokenId,
              value: emissionAmount,
            },
          ],
        },
      });
    }

    // add guard network fee to order
    guardsOrder.push({
      address: GuardsErgoConfigs.networkFeeRepoAddress,
      assets: {
        nativeToken: minimumErg,
        tokens: [
          {
            id: tokenId,
            value: networkFee,
          },
        ],
      },
    });

    return { watchersOrder, guardsOrder };
  };
}

export default EventOrder;
