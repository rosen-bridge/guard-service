import {
  Constant,
  ErgoBox,
  ErgoBoxCandidate,
  ErgoBoxCandidateBuilder,
  TokenId,
} from 'ergo-lib-wasm-nodejs';
import ErgoUtils from '../helpers/ErgoUtils';
import ErgoConfigs from '../helpers/ErgoConfigs';
import { BoxesAssets } from '../models/Interfaces';
import { rosenConfig } from '../../../helpers/RosenConfig';
import Utils from '../../../helpers/Utils';
import { EventTrigger } from '../../../models/Models';
import InputBoxes from './InputBoxes';

class OutputBoxes {
  /**
   * adds a token to ergo box candidate if token amount is positive
   * @param box the box candidate builder
   * @param tokenId the token id
   * @param tokenAmount amount of the token
   */
  static addTokenToBoxBuilder = (
    box: ErgoBoxCandidateBuilder,
    tokenId: string,
    tokenAmount: bigint
  ): void => {
    if (tokenAmount > 0n)
      box.add_token(
        TokenId.from_str(tokenId),
        ErgoUtils.tokenAmountFromBigint(tokenAmount)
      );
  };

  /**
   * creates watcher permit boxes, guards bridge fee box and network fee box
   * @param height current height of the network
   * @param watcherErgAmount amount of Erg in watcher permit box
   * @param watcherTokenAmount amount of payment token in watcher permit box
   * @param watcherRsnAmount amount of RSN token in watcher permit box
   * @param guardBridgeFeeErgAmount amount of Erg in guard bridge fee box
   * @param guardBridgeFeeTokenAmount amount of payment token in guard bridge fee box
   * @param guardRsnAmount amount of Erg in guard bridge fee box
   * @param guardNetworkErgAmount amount of Erg in guard network fee box
   * @param guardNetworkTokenAmount amount of payment token in guard network fee box
   * @param network
   * @param paymentTokenId payment token id
   * @param paymentTxId payment transaction id
   * @param wids list of watcher ids
   */
  static createRewardDistributionBoxes = (
    height: number,
    watcherErgAmount: bigint,
    watcherTokenAmount: bigint,
    watcherRsnAmount: bigint,
    guardBridgeFeeErgAmount: bigint,
    guardBridgeFeeTokenAmount: bigint,
    guardRsnAmount: bigint,
    guardNetworkErgAmount: bigint,
    guardNetworkTokenAmount: bigint,
    network: string,
    paymentTokenId: string,
    paymentTxId: string,
    wids: Uint8Array[]
  ): ErgoBoxCandidate[] => {
    const outBoxes: ErgoBoxCandidate[] = [];
    const rsnTokenId = rosenConfig.RSN;

    // create watchers boxes
    wids.forEach((wid) =>
      outBoxes.push(
        this.createWatcherRewardBox(
          height,
          wid,
          watcherErgAmount,
          network,
          paymentTokenId,
          watcherTokenAmount,
          rosenConfig.RSN,
          watcherRsnAmount
        )
      )
    );

    // guards bridge fee box
    const guardsBridgeFeeBox = new ErgoBoxCandidateBuilder(
      ErgoUtils.boxValueFromBigint(guardBridgeFeeErgAmount),
      ErgoUtils.addressStringToContract(ErgoConfigs.bridgeFeeRepoAddress),
      height
    );
    this.addTokenToBoxBuilder(
      guardsBridgeFeeBox,
      paymentTokenId,
      guardBridgeFeeTokenAmount
    );
    this.addTokenToBoxBuilder(guardsBridgeFeeBox, rsnTokenId, guardRsnAmount);
    guardsBridgeFeeBox.set_register_value(
      4,
      Constant.from_coll_coll_byte([Utils.hexStringToUint8Array(paymentTxId)])
    );
    outBoxes.push(guardsBridgeFeeBox.build());

    // guards network fee box
    const guardsNetworkFeeBox = new ErgoBoxCandidateBuilder(
      ErgoUtils.boxValueFromBigint(guardNetworkErgAmount),
      ErgoUtils.addressStringToContract(ErgoConfigs.networkFeeRepoAddress),
      height
    );
    this.addTokenToBoxBuilder(
      guardsNetworkFeeBox,
      paymentTokenId,
      guardNetworkTokenAmount
    );
    outBoxes.push(guardsNetworkFeeBox.build());

    return outBoxes;
  };

  /**
   * creates an ErgoBox with watcher-permit contract containing event reward
   * @param height current height of blockchain
   * @param wid watcher id
   * @param ergAmount amount of Erg in box
   * @param network
   * @param paymentTokenId reward token id
   * @param paymentTokenAmount reward token amount
   * @param rsnTokenId RSN token id
   * @param rsnTokenAmount RSN token amount
   */
  static createWatcherRewardBox = (
    height: number,
    wid: Uint8Array,
    ergAmount: bigint,
    network: string,
    paymentTokenId: string,
    paymentTokenAmount: bigint,
    rsnTokenId: string,
    rsnTokenAmount: bigint
  ): ErgoBoxCandidate => {
    const contracts = rosenConfig.contractReader(network);
    // create box
    const watcherBox = new ErgoBoxCandidateBuilder(
      ErgoUtils.boxValueFromBigint(ergAmount),
      contracts.permitContract,
      height
    );
    // add box tokens
    this.addTokenToBoxBuilder(watcherBox, contracts.RWTId, 1n);
    this.addTokenToBoxBuilder(watcherBox, paymentTokenId, paymentTokenAmount);
    this.addTokenToBoxBuilder(watcherBox, rsnTokenId, rsnTokenAmount);
    // add box registers
    watcherBox.set_register_value(4, Constant.from_coll_coll_byte([wid]));
    return watcherBox.build();
  };

  /**
   * creates an ErgoBox containing payment to event toAddress
   * @param height current height of blockchain
   * @param address box address
   * @param ergAmount amount of Erg in box
   * @param paymentTokenId payment token id
   * @param paymentTokenAmount payment token amount
   */
  static createPaymentBox = (
    height: number,
    address: string,
    ergAmount: bigint,
    paymentTokenId: string,
    paymentTokenAmount: bigint
  ): ErgoBoxCandidate => {
    const paymentBox = new ErgoBoxCandidateBuilder(
      ErgoUtils.boxValueFromBigint(ergAmount),
      ErgoUtils.addressStringToContract(address),
      height
    );
    this.addTokenToBoxBuilder(paymentBox, paymentTokenId, paymentTokenAmount);
    return paymentBox.build();
  };

  /**
   * creates an ErgoBox containing missing assets of inAssets
   * @param height current height of blockchain
   * @param address box address
   * @param inAssets assets in inputBoxes
   * @param outAssets assets in outputBoxes
   * @param txFee the transaction fee
   */
  static createChangeBox = (
    height: number,
    address: string,
    inAssets: BoxesAssets,
    outAssets: BoxesAssets,
    txFee: bigint
  ): ErgoBoxCandidate => {
    const missingAssets = ErgoUtils.reduceUsedAssets(inAssets, outAssets);

    const changeBox = new ErgoBoxCandidateBuilder(
      ErgoUtils.boxValueFromBigint(missingAssets.ergs - txFee),
      ErgoUtils.addressStringToContract(address),
      height
    );
    Object.keys(missingAssets.tokens).forEach((id) =>
      this.addTokenToBoxBuilder(changeBox, id, missingAssets.tokens[id])
    );

    return changeBox.build();
  };

  /**
   * creates an ErgoBox containing transferring assets to cold storage address
   * @param height current height of blockchain
   * @param assets amount of Erg and tokens in box
   */
  static createColdBox = (
    height: number,
    assets: BoxesAssets
  ): ErgoBoxCandidate => {
    const coldBox = new ErgoBoxCandidateBuilder(
      ErgoUtils.boxValueFromBigint(assets.ergs),
      ErgoUtils.addressStringToContract(ErgoConfigs.coldAddress),
      height
    );

    Object.keys(assets.tokens).forEach((tokenId) => {
      this.addTokenToBoxBuilder(coldBox, tokenId, assets.tokens[tokenId]);
    });

    return coldBox.build();
  };

  /**
   * generates outputs of payment and reward distribution tx for an Erg-Distribution event in ergo chain
   * @param event the event trigger model
   * @param eventBox the event trigger box
   * @param commitmentBoxes the not-merged valid commitment boxes for the event
   * @param rsnCoef rsn fee ratio
   * @param currentHeight current height of blockchain
   * @param paymentTokenId the payment token id
   * @param network
   * @param bridgeFee event bridge fee
   * @param networkFee event network fee
   * @param paymentTxId payment transaction id
   * @return the generated reward reduced transaction
   */
  static ergEventRewardBoxes = (
    event: EventTrigger,
    eventBox: ErgoBox,
    commitmentBoxes: ErgoBox[],
    rsnCoef: [bigint, bigint],
    currentHeight: number,
    paymentTokenId: string,
    network: string,
    bridgeFee: bigint,
    networkFee: bigint,
    paymentTxId: string
  ): ErgoBoxCandidate[] => {
    const watchersLen: number = event.WIDs.length + commitmentBoxes.length;
    const rsnFee = (bridgeFee * rsnCoef[0]) / rsnCoef[1];

    // calculate assets of reward boxes
    const watcherErgAmount: bigint =
      (bridgeFee * ErgoConfigs.watchersSharePercent) /
        100n /
        BigInt(watchersLen) +
      ErgoConfigs.minimumErg;
    const watcherTokenAmount = 0n;
    const watcherRsnAmount: bigint =
      (rsnFee * ErgoConfigs.watchersRSNSharePercent) /
      100n /
      BigInt(watchersLen);
    const guardBridgeFeeErgAmount: bigint =
      bridgeFee - BigInt(watchersLen) * watcherErgAmount;
    const guardBridgeFeeTokenAmount = 0n;
    const guardRsnAmount: bigint =
      rsnFee - BigInt(watchersLen) * watcherRsnAmount;
    const guardNetworkErgAmount = networkFee;
    const guardNetworkTokenAmount = 0n;
    const wids: Uint8Array[] = [
      ...event.WIDs.map(Utils.hexStringToUint8Array),
      ...commitmentBoxes.map((box) => InputBoxes.getErgoBoxWID(box)),
    ];

    // create output boxes
    return OutputBoxes.createRewardDistributionBoxes(
      currentHeight,
      watcherErgAmount,
      watcherTokenAmount,
      watcherRsnAmount,
      guardBridgeFeeErgAmount,
      guardBridgeFeeTokenAmount,
      guardRsnAmount,
      guardNetworkErgAmount,
      guardNetworkTokenAmount,
      network,
      paymentTokenId,
      paymentTxId,
      wids
    );
  };

  /**
   * generates outputs of payment and reward distribution tx for a Token-Distribution event in ergo chain
   * @param event the event trigger model
   * @param eventBox the event trigger box
   * @param commitmentBoxes the not-merged valid commitment boxes for the event
   * @param rsnCoef rsn fee ratio
   * @param currentHeight current height of blockchain
   * @param paymentTokenId the payment token id
   * @param network
   * @param bridgeFee event bridge fee
   * @param networkFee event network fee
   * @param paymentTxId payment transaction id
   * @return the generated reward reduced transaction
   */
  static tokenEventRewardBoxes = (
    event: EventTrigger,
    eventBox: ErgoBox,
    commitmentBoxes: ErgoBox[],
    rsnCoef: [bigint, bigint],
    currentHeight: number,
    paymentTokenId: string,
    network: string,
    bridgeFee: bigint,
    networkFee: bigint,
    paymentTxId: string
  ): ErgoBoxCandidate[] => {
    const watchersLen: number = event.WIDs.length + commitmentBoxes.length;
    const rsnFee = (bridgeFee * rsnCoef[0]) / rsnCoef[1];

    // calculate assets of reward boxes
    const watcherErgAmount: bigint = ErgoConfigs.minimumErg;
    const watcherTokenAmount: bigint =
      (bridgeFee * ErgoConfigs.watchersSharePercent) /
      100n /
      BigInt(watchersLen);
    const watcherRsnAmount: bigint =
      (rsnFee * ErgoConfigs.watchersRSNSharePercent) /
      100n /
      BigInt(watchersLen);
    const guardBridgeFeeErgAmount: bigint = ErgoConfigs.minimumErg;
    const guardBridgeFeeTokenAmount: bigint =
      bridgeFee - BigInt(watchersLen) * watcherTokenAmount;
    const guardRsnAmount: bigint =
      rsnFee - BigInt(watchersLen) * watcherRsnAmount;
    const guardNetworkErgAmount: bigint = ErgoConfigs.minimumErg;
    const guardNetworkTokenAmount = networkFee;
    const wids: Uint8Array[] = [
      ...event.WIDs.map(Utils.hexStringToUint8Array),
      ...commitmentBoxes.map((box) => InputBoxes.getErgoBoxWID(box)),
    ];

    // create output boxes
    return OutputBoxes.createRewardDistributionBoxes(
      currentHeight,
      watcherErgAmount,
      watcherTokenAmount,
      watcherRsnAmount,
      guardBridgeFeeErgAmount,
      guardBridgeFeeTokenAmount,
      guardRsnAmount,
      guardNetworkErgAmount,
      guardNetworkTokenAmount,
      network,
      paymentTokenId,
      paymentTxId,
      wids
    );
  };
}

export default OutputBoxes;
