import * as wasm from 'ergo-lib-wasm-nodejs';
import NodeApi from '../../chains/ergo/network/NodeApi';
import { CommitmentJson, PublishedCommitment } from './Interfaces';
import { TransactionHintsBag } from 'ergo-lib-wasm-nodejs';

class MultiSigUtils {
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
  static extract_hints = async (
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
    const context = await NodeApi.getErgoStateContext();
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

  static generatedCommitmentToPublishCommitment = (
    commitmentJson: CommitmentJson
  ): PublishedCommitment => {
    const publicHints = commitmentJson.publicHints;
    const publishCommitments: {
      [index: string]: Array<{ a: string; position: string }>;
    } = {};
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
