import axios from 'axios';
import { ErgoBox } from 'ergo-lib-wasm-nodejs';
import {
  Asset,
  AssetMap,
  Box,
  Boxes,
  CoveringErgoBoxes,
  ExplorerTransaction,
} from '../models/Interfaces';
import { JsonBI } from '../../../network/NetworkModels';
import ErgoConfigs from '../helpers/ErgoConfigs';
import { logger } from '../../../log/Logger';

class ExplorerApi {
  static explorerApi = axios.create({
    baseURL: ErgoConfigs.explorer.url,
    timeout: ErgoConfigs.explorer.timeout * 1000,
  });

  /**
   * gets boxes of an ergoTree
   * @param ergoTree the address ergoTree
   * @param offset
   * @param limit
   */
  static getBoxesForErgoTree = async (
    ergoTree: string,
    offset = 0,
    limit = 100
  ): Promise<Boxes> => {
    return this.explorerApi
      .get<Boxes>(
        `/v1/boxes/unspent/byErgoTree/${ergoTree}?offset=${offset}&limit=${limit}`,
        {
          transformResponse: (data) => JsonBI.parse(data),
        }
      )
      .then((res) => res.data)
      .catch((e) => {
        logger.warn(
          `An error occurred while getting boxes for ErgoTree [${ergoTree}] from Ergo Explorer: [${e}]`
        );
        return {
          items: [],
          total: 0,
        };
      });
  };

  /**
   * gets boxes containing tokenId
   * @param tokenId the address ergoTree
   */
  static getBoxesByTokenId = async (tokenId: string): Promise<Boxes> => {
    return this.explorerApi
      .get<Boxes>(`/v1/boxes/unspent/byTokenId/${tokenId}`)
      .then((res) => res.data)
      .catch((e) => {
        logger.warn(
          `An error occurred while getting boxes containing token [${tokenId}] from Ergo Explorer: [${e}]`
        );
        return {
          items: [],
          total: 0,
        };
      });
  };

  /**
   * gets enough boxes of an ergoTree to satisfy needed amount of erg and tokens
   * @param tree the address ergoTree
   * @param ergAmount needed amount of erg
   * @param tokens needed tokens
   * @param filter condition to filter boxes
   */
  static getCoveringErgAndTokenForErgoTree = async (
    tree: string,
    ergAmount: bigint,
    tokens: AssetMap = {},
    filter: (box: Box) => boolean = () => true
  ): Promise<CoveringErgoBoxes> => {
    const remaining = () => {
      const isAnyTokenRemain = Object.entries(tokens)
        .map(([, amount]) => amount > 0)
        .reduce((a, b) => a || b, false);
      return isAnyTokenRemain || ergAmount > 0;
    };

    const res: Box[] = [];
    const boxesItems = await this.getBoxesForErgoTree(tree, 0, 1);
    const total = boxesItems.total;
    let offset = 0;

    while (offset < total && remaining()) {
      const boxes = await this.getBoxesForErgoTree(tree, offset, 10);
      for (const box of boxes.items) {
        if (filter(box)) {
          res.push(box);
          ergAmount -= box.value;
          box.assets.map((asset: Asset) => {
            if (Object.prototype.hasOwnProperty.call(tokens, asset.tokenId)) {
              tokens[asset.tokenId] -= asset.amount;
            }
          });
          if (!remaining()) break;
        }
      }
      offset += 10;
    }

    return {
      boxes: res.map((box) => ErgoBox.from_json(JsonBI.stringify(box))),
      covered: !remaining(),
    };
  };

  /**
   * gets tx confirmation
   * @param txId
   */
  static getTxConfirmation = async (txId: string): Promise<number> => {
    try {
      return this.explorerApi
        .get<{ numConfirmations: number }>(`/v1/transactions/${txId}`)
        .then((res) => res.data.numConfirmations);
    } catch (e) {
      logger.warn(
        `An error occurred while getting confirmation for tx [${txId}] from Ergo Explorer: [${e}]`
      );
      return -1;
    }
  };

  /**
   * checks if tx is in mempool
   * @param txId
   */
  static isTxInMempool = async (txId: string): Promise<boolean> => {
    return this.explorerApi
      .get(`/v0/transactions/unconfirmed/${txId}`)
      .then(() => true)
      .catch((e) => {
        logger.warn(
          `An error occurred while checking if tx [${txId}] exist in mempool from Ergo Explorer: [${e}]`
        );
        return false;
      });
  };

  /**
   * checks if box is in network and unspent
   * @param boxId
   */
  static isBoxUnspentAndValid = async (boxId: string): Promise<boolean> => {
    return this.explorerApi
      .get(`/v1/boxes/${boxId}`)
      .then((res) => res.data.spentTransactionId === null)
      .catch((e) => {
        logger.warn(
          `An error occurred while checking if box [${boxId}] is unspent and valid from Ergo Explorer: [${e}]`
        );
        return false;
      });
  };

  /**
   * Searches for a confirmed tx with the specified txId
   * @param txId, the requested txId
   */
  static getConfirmedTx = (
    txId: string
  ): Promise<ExplorerTransaction | null> => {
    return this.explorerApi
      .get<ExplorerTransaction>(`/v1/transactions/${txId}`)
      .then((res) => {
        return res.data;
      })
      .catch((e) => {
        logger.warn(
          `An error occurred while fetching confirmed tx [${txId}] from Ergo Explorer: [${e}]`
        );
        return null;
      });
  };
}

export default ExplorerApi;
