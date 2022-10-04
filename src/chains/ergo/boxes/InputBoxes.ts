import { EventTrigger } from '../../../models/Models';
import { ErgoBox, ErgoBoxCandidate } from 'ergo-lib-wasm-nodejs';
import ExplorerApi from '../network/ExplorerApi';
import { JsonBI } from '../../../network/NetworkModels';
import Utils from '../../../helpers/Utils';
import { rosenConfig } from '../../../helpers/RosenConfig';
import { Buffer } from 'buffer';
import { dbAction } from '../../../db/DatabaseAction';
import { logger } from '../../../log/Logger';

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
    return commitments.map((commitment) =>
      ErgoBox.sigma_parse_bytes(
        Utils.base64StringToUint8Array(commitment.boxSerialized)
      )
    );
  };

  /**
   * @param tokenId reward tokenId
   * @return RSN ratio for the corresponding tokenId
   */
  static getRSNRatioCoef = async (
    tokenId: string
  ): Promise<[bigint, bigint]> => {
    const boxes = await ExplorerApi.getBoxesByTokenId(rosenConfig.rsnRatioNFT);
    if (boxes.total !== 1)
      throw new Error(
        `impossible case, found ${boxes.total} boxes containing rsnRatioNFT [${rosenConfig.rsnRatioNFT}]`
      );
    const box = ErgoBox.from_json(JsonBI.stringify(boxes.items[0]));
    const boxId = box.box_id().to_str();

    const tokenIds = box.register_value(4)?.to_coll_coll_byte();
    const ratios = box.register_value(5)?.to_i64_str_array();
    const decimalCoef = box.register_value(6)?.to_i64();
    if (tokenIds === undefined)
      throw new Error(`failed to fetch tokenIds from box [${boxId}]`);
    if (ratios === undefined || decimalCoef === undefined)
      throw new Error(
        `failed to fetch ratios or decimal coefficient from box [${boxId}]`
      );
    const tokenIndex = tokenIds!
      .map((idBytes) => Utils.Uint8ArrayToHexString(idBytes))
      .indexOf(tokenId);
    if (tokenIndex === -1)
      throw new Error(`tokenId [${tokenId}] not found in box [${boxId}]`);

    return [BigInt(ratios![tokenIndex]), BigInt(decimalCoef!.to_str())];
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
      throw new Error(
        `impossible case, found ${boxes.total} boxes containing guardNFT [${rosenConfig.guardNFT}]`
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
