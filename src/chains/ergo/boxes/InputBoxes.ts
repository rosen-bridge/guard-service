import { EventTrigger } from '../../../models/Models';
import { ErgoBox, ErgoBoxCandidate } from 'ergo-lib-wasm-nodejs';
import ExplorerApi from '../network/ExplorerApi';
import { JsonBI } from '../../../network/NetworkModels';
import Utils from '../../../helpers/Utils';
import { rosenConfig } from '../../../helpers/RosenConfig';
import { Buffer } from 'buffer';
import { dbAction } from '../../../db/DatabaseAction';
import { ImpossibleBehavior } from '../../../helpers/errors';

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
   * gets the commitment boxes which created before the event trigger and didn't merge into it
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
    const usedWIDs = event.WIDs;
    const commitmentBoxes: ErgoBox[] = [];
    commitments.forEach((commitment) => {
      if (!usedWIDs.includes(commitment.WID)) {
        usedWIDs.push(commitment.WID);
        commitmentBoxes.push(
          ErgoBox.sigma_parse_bytes(
            Utils.base64StringToUint8Array(commitment.boxSerialized)
          )
        );
      }
    });
    return commitmentBoxes;
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
   * compares two ErgoBoxCandidate. Used in sorting permit boxes with their WIDs
   * @param a
   * @param b
   */
  static compareTwoBoxCandidate = (
    a: ErgoBoxCandidate,
    b: ErgoBoxCandidate
  ): number => {
    const aR4 = a.register_value(4)?.to_coll_coll_byte()[0];
    const bR4 = b.register_value(4)?.to_coll_coll_byte()[0];

    if (aR4 !== undefined && bR4 !== undefined) {
      const aWID = Buffer.from(aR4).toString('hex');
      const bWID = Buffer.from(bR4).toString('hex');
      if (aWID < bWID) return -1;
      else if (aWID > bWID) return 1;
      else return 0;
    } else {
      if (a.ergo_tree().to_base16_bytes() < b.ergo_tree().to_base16_bytes())
        return -1;
      else if (
        a.ergo_tree().to_base16_bytes() > b.ergo_tree().to_base16_bytes()
      )
        return 1;
      else return 0;
    }
  };
}

export default InputBoxes;
