import {
  Constant,
  ErgoBoxCandidate,
  ErgoBoxCandidateBuilder,
  TokenId,
} from 'ergo-lib-wasm-nodejs';
import ErgoUtils from '../helpers/ErgoUtils';
import ErgoConfigs from '../helpers/ErgoConfigs';
import { BoxesAssets } from '../models/Interfaces';
import { RosenConfig, rosenConfig } from '../../../helpers/RosenConfig';
import Configs from '../../../helpers/Configs';

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
}

export default OutputBoxes;
