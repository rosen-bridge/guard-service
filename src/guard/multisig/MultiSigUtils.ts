import * as wasm from 'ergo-lib-wasm-nodejs';
import {
  CommitmentJson,
  PublishedCommitment,
  SingleCommitment,
} from './Interfaces';
import { TransactionHintsBag } from 'ergo-lib-wasm-nodejs';
import { DefaultLoggerFactory } from '@rosen-bridge/abstract-logger';

const logger = DefaultLoggerFactory.getInstance().getLogger(import.meta.url);

class MultiSigUtils {
  private static instance: MultiSigUtils;
  getStateContext: () => Promise<wasm.ErgoStateContext>;

  /**
   * generates a MultiSigUtils object if it doesn't exist
   * @returns MultiSigUtils instance
   */
  public static getInstance = () => {
    if (!MultiSigUtils.instance) {
      logger.debug("MultiSigUtils instance didn't exist. Creating a new one");
      MultiSigUtils.instance = new MultiSigUtils();
    }
    return MultiSigUtils.instance;
  };

  /**
   * initializes `getStateContext` function
   * @param getStateContextFunction
   */
  public init(getStateContextFunction: () => Promise<wasm.ErgoStateContext>) {
    this.getStateContext = getStateContextFunction;
  }

  /**
   * gets public keys hex string and convert them to the Propositions
   * @param pubKeys
   */
  static publicKeyToProposition = (
    pubKeys: Array<string>
  ): wasm.Propositions => {
    const res = new wasm.Propositions();
    pubKeys.forEach((item) => {
      res.add_proposition_from_byte(
        Uint8Array.from(Buffer.from('cd' + item, 'hex'))
      );
    });
    return res;
  };

  /**
   * extracted hints for a transaction
   * @param tx
   * @param boxes
   * @param dataBoxes
   * @param signed
   * @param simulated
   */
  extract_hints = async (
    tx: wasm.Transaction,
    boxes: Array<wasm.ErgoBox>,
    dataBoxes: Array<wasm.ErgoBox>,
    signed: Array<string>,
    simulated: Array<string>
  ): Promise<TransactionHintsBag> => {
    const simulatedPropositions =
      MultiSigUtils.publicKeyToProposition(simulated);
    const realPropositions = MultiSigUtils.publicKeyToProposition(signed);
    const inputBoxes = wasm.ErgoBoxes.empty();
    boxes.forEach((item) => inputBoxes.add(item));
    const dataInputBoxes = wasm.ErgoBoxes.empty();
    dataBoxes.forEach((item) => dataInputBoxes.add(item));
    const context = await this.getStateContext();
    return wasm.extract_hints(
      tx,
      context,
      inputBoxes,
      dataInputBoxes,
      realPropositions,
      simulatedPropositions
    );
  };

  /**
   * adding hints to a transaction hints bag
   * @param currentHints
   * @param newHints
   * @param tx
   */
  static add_hints = (
    currentHints: wasm.TransactionHintsBag,
    newHints: wasm.TransactionHintsBag,
    tx: wasm.ReducedTransaction
  ): void => {
    for (let index = 0; index < tx.unsigned_tx().inputs().len(); index++) {
      currentHints.add_hints_for_input(
        index,
        newHints.all_hints_for_input(index)
      );
    }
  };

  /**
   * converting published commitment in the p2p network to hints bag
   * @param commitments
   * @param pubKey
   */
  static convertToHintBag = (
    commitments: PublishedCommitment,
    pubKey: string
  ): TransactionHintsBag => {
    const resultJson: CommitmentJson = {
      secretHints: {},
      publicHints: {},
    };
    Object.keys(commitments).forEach((key) => {
      const inputCommitments = commitments[key];
      resultJson.secretHints[key] = [];
      if (!resultJson.publicHints[key]) {
        resultJson.publicHints[key] = [];
      }
      inputCommitments.forEach((commitment) => {
        resultJson.publicHints[key].push({
          a: commitment.a,
          hint: 'cmtReal',
          position: commitment.position,
          type: 'dlog',
          pubkey: {
            op: '205',
            h: pubKey,
          },
        });
      });
    });
    return wasm.TransactionHintsBag.from_json(JSON.stringify(resultJson));
  };

  /**
   * extract commitments for specific guard from transaction hintbag
   * when some hintbag extracted from json it used to get commitment for one guard
   * @param extracted: extract hintbag
   * @param guardPkHex: selected guard pk
   * @param inputCount: number of inputs
   */
  static convertHintBagToPublishedCommitmentForGuard = (
    extracted: wasm.TransactionHintsBag,
    guardPkHex: string,
    inputCount: number
  ) => {
    const res: PublishedCommitment = {};
    const commitmentJson = extracted.to_json() as CommitmentJson;
    for (let index = 0; index < inputCount; index++) {
      res[`${index}`] = [];
      const inputCommitments = commitmentJson.publicHints[`${index}`];
      inputCommitments.forEach((item) => {
        if (item.pubkey.h === guardPkHex) {
          res[`${index}`].push({ position: item.position, a: item.a });
        }
      });
    }
    return res;
  };

  /**
   * compare two list of published commitment and verify to be equal.
   * @param item1
   * @param item2
   * @param inputLength
   */
  static comparePublishedCommitmentsToBeDiffer = (
    item1: PublishedCommitment,
    item2: PublishedCommitment,
    inputLength: number
  ) => {
    for (let inputIndex = 0; inputIndex < inputLength; inputIndex++) {
      const item1InputCommitments = item1[`${inputIndex}`];
      const item2InputCommitments = item2[`${inputIndex}`];
      if (
        item1InputCommitments &&
        item2InputCommitments &&
        item1InputCommitments.length > 0 &&
        item2InputCommitments.length > 0
      ) {
        if (item2InputCommitments.length !== item1InputCommitments.length) {
          return true;
        }
        if (
          !MultiSigUtils.compareSingleInputCommitmentsAreEquals(
            item1InputCommitments,
            item2InputCommitments
          )
        ) {
          return true;
        }
      }
    }
    return false;
  };

  /**
   * compare two single commitments to be equals
   * @param item1
   * @param item2
   */
  static compareSingleInputCommitmentsAreEquals = (
    item1: Array<SingleCommitment>,
    item2: Array<SingleCommitment>
  ) => {
    const item1Sorted = item1.sort((a, b) =>
      a.position.localeCompare(b.position)
    );
    const item2Sorted = item2.sort((a, b) =>
      a.position.localeCompare(b.position)
    );
    let res = true;
    item1Sorted.map((item, index) => {
      if (item2Sorted[index].a && item.a !== item2Sorted[index].a) {
        res = false;
      }
    });
    return res;
  };

  /**
   * Converting Guard own hints with what's send to others guard
   * @param commitmentJson
   */
  static generatedCommitmentToPublishCommitment = (
    commitmentJson: CommitmentJson
  ): PublishedCommitment => {
    const publicHints = commitmentJson.publicHints;
    const publishCommitments: PublishedCommitment = {};
    Object.keys(publicHints).forEach((inputIndex) => {
      const inputHints = publicHints[inputIndex].filter((item) => !item.secret);
      if (inputHints) {
        publishCommitments[inputIndex] = inputHints.map((item) => ({
          a: item.a,
          position: item.position,
        }));
      }
    });
    return publishCommitments;
  };
}

export default MultiSigUtils;
