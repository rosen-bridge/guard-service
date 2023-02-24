import { Buffer } from 'buffer';
import { ErgoBox, ErgoBoxCandidate } from 'ergo-lib-wasm-nodejs';
import { cloneDeep, set, uniqBy } from 'lodash-es';

import { CommitmentEntity } from '@rosen-bridge/watcher-data-extractor';

import { EventTrigger } from '../../../models/Models';
import ExplorerApi from '../network/ExplorerApi';
import { JsonBI } from '../../../network/NetworkModels';
import Utils from '../../../helpers/Utils';
import { rosenConfig } from '../../../helpers/RosenConfig';
import { dbAction } from '../../../db/DatabaseAction';
import { ImpossibleBehavior } from '../../../helpers/errors';
import { ExplorerTransaction, NodeTransaction } from '../models/Interfaces';

class InputBoxes {
  /**
   * @param event the event trigger model
   * @return the corresponding box of the event trigger
   */
  static getEventBox = async (event: EventTrigger): Promise<ErgoBox> => {
    const eventData = (await dbAction.getEventById(event.getId()))?.eventData;
    if (eventData === undefined) {
      const eventId = event.getId();
      throw new Error(`event [${eventId}] not found`);
    }
    return ErgoBox.sigma_parse_bytes(
      Utils.base64StringToUint8Array(eventData!.boxSerialized)
    );
  };

  /**
   * Get the commitment boxes which are created before the event trigger and
   * aren't merged into it, while omitting any duplicate commitments
   * @param event the event trigger model
   * @return the valid commitment boxes
   */
  static getEventValidCommitments = async (
    event: EventTrigger
  ): Promise<ErgoBox[]> => {
    const eventData = (await dbAction.getEventById(event.getId()))?.eventData;

    if (eventData === undefined) {
      const eventId = event.getId();
      throw new Error(`event [${eventId}] not found`);
    }

    const eventBoxHeight = eventData!.height;
    const commitments = await dbAction.getValidCommitments(
      event.getId(),
      eventBoxHeight
    );

    const rejectSpentCommitments = (commitment: CommitmentEntity) =>
      !event.WIDs.includes(commitment.WID);
    const getCommitmentUint8ArrayFromBase64 = (commitment: CommitmentEntity) =>
      Utils.base64StringToUint8Array(commitment.boxSerialized);

    const commitmentBoxes = uniqBy(commitments, 'WID')
      .filter(rejectSpentCommitments)
      .map(getCommitmentUint8ArrayFromBase64)
      .map(ErgoBox.sigma_parse_bytes);

    return commitmentBoxes;
  };
  /**
   * @param eventId the event trigger id
   * @return the the payment transaction id of the event trigger
   */
  static getEventPaymentTransactionId = async (
    eventId: string
  ): Promise<string> => {
    return (await dbAction.getEventPaymentTransaction(eventId)).txId;
  };

  /**
   * reads WID from register r4 of the commitment box (box type is ErgoBox)
   * @param box the commitment box
   */
  static getErgoBoxWID = (box: ErgoBox): Uint8Array => {
    const wid = box.register_value(4)?.to_coll_coll_byte()[0];
    if (wid === undefined) {
      const boxId = box.box_id().to_str();
      throw new Error(`failed to read WID from register R4 of box [${boxId}]`);
    }
    return wid!;
  };

  /**
   * reads WID from register r4 of the commitment box (box type is ErgoBoxCandidate)
   * @param box the commitment box
   */
  static getBoxCandidateWIDString = (box: ErgoBoxCandidate): string => {
    const wid = box.register_value(4)?.to_coll_coll_byte()[0];
    if (wid === undefined) {
      throw new Error('failed to read WID from register R4 of box candidate');
    }
    return Buffer.from(wid!).toString('hex');
  };

  /**
   * @return ErgoBox containing guards public keys
   */
  static getGuardsInfoBox = async (): Promise<ErgoBox> => {
    const boxes = await ExplorerApi.getBoxesByTokenId(rosenConfig.guardNFT);
    if (boxes.total !== 1) {
      throw new ImpossibleBehavior(
        `Found ${boxes.total} boxes containing guardNFT [${rosenConfig.guardNFT}]`
      );
    }
    return ErgoBox.from_json(JsonBI.stringify(boxes.items[0]));
  };

  /**
   * compares two ErgoBoxCandidate by ErgoTree and first value of collCollByte formatting of R4
   *  note: if boxes have same ergoTree but one of them has no R4 or invalid type
   *  it considers them as equal (returns 0)
   * @param a
   * @param b
   */
  static compareTwoBoxCandidate = (
    a: ErgoBoxCandidate,
    b: ErgoBoxCandidate
  ): number => {
    const aErgoTree = a.ergo_tree().to_base16_bytes().toLowerCase();
    const bErgoTree = b.ergo_tree().to_base16_bytes().toLowerCase();

    if (aErgoTree === bErgoTree) {
      const aR4 = a.register_value(4)?.to_coll_coll_byte()[0];
      const bR4 = b.register_value(4)?.to_coll_coll_byte()[0];

      if (aR4 !== undefined && bR4 !== undefined) {
        const aWID = Buffer.from(aR4).toString('hex');
        const bWID = Buffer.from(bR4).toString('hex');
        return aWID.localeCompare(bWID);
      } else {
        return 0;
      }
    } else {
      return aErgoTree.localeCompare(bErgoTree);
    }
  };

  /**
   * converts a tx from ExplorerTransaction format to NodeTransaction format
   * @param explorerTx
   */
  static explorerTxToNodeTx = (
    explorerTx: ExplorerTransaction
  ): NodeTransaction => {
    const nodeTx = cloneDeep(explorerTx) as unknown as Record<string, any>;
    for (const box of nodeTx.inputs) {
      Object.keys(box.additionalRegisters).forEach((regKey) => {
        box.additionalRegisters[regKey] =
          box.additionalRegisters[regKey].serializedValue;
      });
    }
    for (const box of nodeTx.dataInputs) {
      Object.keys(box.additionalRegisters).forEach((regKey) => {
        box.additionalRegisters[regKey] =
          box.additionalRegisters[regKey].serializedValue;
      });
    }
    for (const box of nodeTx.outputs) {
      Object.keys(box.additionalRegisters).forEach((regKey) => {
        box.additionalRegisters[regKey] =
          box.additionalRegisters[regKey].serializedValue;
      });
    }
    return nodeTx as NodeTransaction;
  };
}

export default InputBoxes;
