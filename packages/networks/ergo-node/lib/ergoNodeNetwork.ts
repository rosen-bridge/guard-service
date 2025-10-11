import * as ergoLib from 'ergo-lib-wasm-nodejs';
import { BlockHeaders, ErgoStateContext } from 'ergo-lib-wasm-nodejs';
import all from 'it-all';

import { AbstractLogger } from '@rosen-bridge/abstract-logger';
import JsonBigInt from '@rosen-bridge/json-bigint';
import {
  FailedError,
  TokenDetail,
  UNKNOWN_TOKEN,
} from '@rosen-chains/abstract-chain';
import { AbstractErgoNetwork } from '@rosen-chains/ergo';
import ergoNodeClientFactory, {
  IndexedErgoBox,
} from '@rosen-clients/ergo-node';

import handleApiError from './handleApiError';

const TX_FETCHING_PAGE_SIZE = 50;
const BOX_FETCHING_PAGE_SIZE = 50;

interface ErgoNodeNetworkOptions {
  logger?: AbstractLogger;
  nodeBaseUrl: string;
}

interface ErgoLibSerializableObject {
  sigma_serialize_bytes: () => Uint8Array;
}

class ErgoNodeNetwork extends AbstractErgoNetwork {
  private client: ReturnType<typeof ergoNodeClientFactory>;

  constructor({ logger, nodeBaseUrl }: ErgoNodeNetworkOptions) {
    super(logger);
    this.client = ergoNodeClientFactory(nodeBaseUrl);
  }

  /**
   * get current block height
   */
  public getHeight = async () => {
    try {
      const nodeInfo = await this.client.getNodeInfo();
      this.logger.debug(
        `requested 'getNodeInfo'. res: ${JsonBigInt.stringify(nodeInfo)}`,
      );
      return Number(nodeInfo.fullHeight);
    } catch (error: any) {
      return handleApiError(error, 'Failed to get height from Ergo Node:');
    }
  };

  /**
   * get confirmations of a tx or -1 if tx is not in the blockchain
   * @param txId
   */
  public getTxConfirmation = async (txId: string) => {
    try {
      const tx = await this.client.getTxById(txId);
      this.logger.debug(
        `requested 'getTxById' for txId [${txId}]. res: ${JsonBigInt.stringify(
          tx,
        )}`,
      );
      return Number(tx.numConfirmations);
    } catch (error: any) {
      const baseError = 'Failed to get tx confirmations from Ergo Node:';
      return handleApiError(error, baseError, {
        handleRespondedState: (error) => {
          if (error.response.status === 404) return -1;
          throw new FailedError(
            `${baseError} [${error.response.status}] ${error.response.data.reason}`,
          );
        },
      });
    }
  };

  /**
   * get all erg and tokens amount in an address
   * @param address
   */
  public getAddressAssets = async (address: string) => {
    try {
      const balance = await this.client.getAddressBalanceTotal(address);
      this.logger.debug(
        `requested 'getAddressBalanceTotal' for address [${address}]. res: ${JsonBigInt.stringify(
          balance,
        )}`,
      );
      const confirmed = balance.confirmed;
      if (!confirmed) {
        return {
          nativeToken: 0n,
          tokens: [],
        };
      }

      type BalanceInfoTokensItem = (typeof confirmed.tokens)[0];
      const areAllTokensValid = (
        tokens: BalanceInfoTokensItem[],
      ): tokens is Required<BalanceInfoTokensItem>[] =>
        tokens.every((token) => token.tokenId && token.amount);

      if (!areAllTokensValid(confirmed.tokens)) {
        throw new FailedError(
          `An error occurred while getting address [${address}] assets: Some tokens don't have an id or amount.`,
        );
      }

      return {
        nativeToken: confirmed.nanoErgs,
        tokens: confirmed.tokens.map((token) => ({
          id: token.tokenId,
          value: token.amount,
        })),
      };
    } catch (error) {
      return handleApiError(
        error,
        'Failed to get address assets from Ergo Node:',
      );
    }
  };

  /**
   * get all tx ids of a block
   * @param blockId
   */
  public getBlockTransactionIds = async (blockId: string) => {
    try {
      const { transactions } =
        await this.client.getBlockTransactionsById(blockId);
      const txIds = transactions.map((tx) => tx.id);
      this.logger.debug(
        `requested block transaction ids with 'getBlockTransactionsById' for blockId [${blockId}]. res: ${JsonBigInt.stringify(
          txIds,
        )}`,
      );

      if (txIds.includes(undefined)) {
        throw new FailedError(
          `An error occurred while getting block [${blockId}] transaction ids: Some transactions don't have an id.`,
        );
      }
      return txIds as string[];
    } catch (error) {
      const baseError = 'Failed to get block transaction ids from Ergo Node:';
      return handleApiError(error, baseError, {
        handleRespondedState: (error) => {
          if (error.response.status === 404) return [] as string[];
          throw new FailedError(
            `${baseError} [${error.response.status}] ${error.response.data.reason}`,
          );
        },
      });
    }
  };

  /**
   * get info of a block
   * @param blockId
   */
  public getBlockInfo = async (blockId: string) => {
    try {
      const blockInfo = await this.client.getBlockHeaderById(blockId);
      this.logger.debug(
        `requested block header with 'getBlockHeaderById' for blockId [${blockId}]. res: ${JsonBigInt.stringify(
          blockInfo,
        )}`,
      );

      return {
        hash: blockId,
        parentHash: blockInfo.parentId,
        height: Number(blockInfo.height),
      };
    } catch (error) {
      return handleApiError(error, 'Failed to get block info from Ergo Node:');
    }
  };

  /**
   * get hex representation of a byte array
   * @param uint8array
   */
  private uint8ArrayToHexString = (uint8array: Uint8Array) =>
    Buffer.from(uint8array).toString('hex');

  /**
   * get hex string representation of a serializable ergo lib object
   * @param serializable an ergo lib object with `sigma_serialize_bytes` prop
   */
  private serializableToHexString = (serializable: ErgoLibSerializableObject) =>
    this.uint8ArrayToHexString(serializable.sigma_serialize_bytes());

  /**
   * get a transaction by its id
   * @param txId
   * @param blockId
   * @returns
   */
  public getTransaction = async (txId: string, blockId: string) => {
    try {
      const blockTxs = await this.client.getBlockTransactionsById(blockId);
      const tx = blockTxs.transactions.find((tx) => tx.id === txId);
      this.logger.debug(
        `requested transaction with 'getBlockTransactionsById' for txId [${txId}] and blockId [${blockId}]. res: ${JsonBigInt.stringify(
          tx,
        )}`,
      );
      if (!tx) throw Error(`tx [${txId}] is not in block [${blockId}]`);
      return ergoLib.Transaction.from_json(JsonBigInt.stringify(tx));
    } catch (error) {
      return handleApiError(error, 'Failed to get tx from Ergo Node:');
    }
  };

  /**
   * submit a transaction to the network
   * @param tx the transaction
   */
  public submitTransaction = async (tx: ergoLib.Transaction) => {
    try {
      await this.client.sendTransactionAsBytes(
        Buffer.from(tx.sigma_serialize_bytes()).toString('hex'),
      );
    } catch (error) {
      return handleApiError(
        error,
        'Failed to submit transaciton to Ergo Node:',
      );
    }
  };

  /**
   * get a mempool tx in each iteration until there are no more txs in it
   */
  private async *getOneMempoolTx() {
    let currentPage = 0;

    while (true) {
      const txsPage = await this.client.getUnconfirmedTransactions({
        offset: currentPage * TX_FETCHING_PAGE_SIZE,
        limit: TX_FETCHING_PAGE_SIZE,
      });

      if (txsPage.length) {
        yield* txsPage;
        currentPage += 1;
      } else {
        return;
      }
    }
  }

  /**
   * get all txs in the mempool
   */
  public getMempoolTransactions = async () => {
    try {
      const txsPageIterator = this.getOneMempoolTx();
      const txs = await all(txsPageIterator);
      this.logger.debug(
        `requested mempool transactions. res: ${JsonBigInt.stringify(
          txs.map((tx) => tx.id),
        )}`,
      );
      return txs
        .filter((tx) => tx.id)
        .map((tx) => ergoLib.Transaction.from_json(JsonBigInt.stringify(tx)));
    } catch (error) {
      return handleApiError(
        error,
        'Failed to get mempool transactions from Ergo Node:',
      );
    }
  };

  /**
   * get utxos of an address
   * @param address
   * @param offset
   * @param limit
   */
  private getRawAddressBoxes = async (
    address: string,
    offset: number,
    limit: number,
  ) => {
    const res = await this.client.getBoxesByAddressUnspent(address, {
      offset: offset,
      limit: limit,
    });
    this.logger.debug(
      `requested 'getBoxesByAddressUnspent' for address [${address}]. res: ${JsonBigInt.stringify(
        res,
      )}`,
    );
    return res;
  };

  /**
   * get utxos of an address
   * @param address
   * @param offset
   * @param limit
   */
  public getAddressBoxes = async (
    address: string,
    offset: number,
    limit: number,
  ): Promise<ergoLib.ErgoBox[]> => {
    try {
      return (await this.getRawAddressBoxes(address, offset, limit)).map(
        (box: IndexedErgoBox) =>
          ergoLib.ErgoBox.from_json(JsonBigInt.stringify(box)),
      );
    } catch (error) {
      const baseError = 'Failed to get address boxes from Ergo Node:';
      return handleApiError(error, baseError, {
        handleRespondedState: (error) => {
          if (error.response.status === 400) return [];
          throw new FailedError(
            `${baseError} [${error.response.status}] ${error.response.data.reason}`,
          );
        },
      });
    }
  };

  /**
   * get utxos of an address containing a token
   * @param tokenId
   * @param address
   * @param offset
   * @param limit
   */
  public getBoxesByTokenId = async (
    tokenId: string,
    address: string,
    offset = 0,
    limit = 5,
  ): Promise<ergoLib.ErgoBox[]> => {
    try {
      const boxHasToken = (box: IndexedErgoBox) =>
        box.assets?.some((asset) => asset.tokenId === tokenId);

      const eligibleBoxes: Array<ergoLib.ErgoBox> = [];
      let currentPage = 0;
      while (eligibleBoxes.length < offset + limit) {
        const boxesPage = await this.getRawAddressBoxes(
          address,
          currentPage * BOX_FETCHING_PAGE_SIZE,
          BOX_FETCHING_PAGE_SIZE,
        );
        if (boxesPage.length === 0) break;

        eligibleBoxes.push(
          ...boxesPage
            .filter(boxHasToken)
            .map((box: IndexedErgoBox) =>
              ergoLib.ErgoBox.from_json(JsonBigInt.stringify(box)),
            ),
        );
        currentPage++;
      }

      return eligibleBoxes.slice(offset, limit);
    } catch (error) {
      const baseError = 'Failed to get boxes by token id from Ergo Node:';
      return handleApiError(error, baseError, {
        handleRespondedState: (error) => {
          if (error.response.status === 400) return [];
          throw new FailedError(
            `${baseError} [${error.response.status}] ${error.response.data.reason}`,
          );
        },
      });
    }
  };

  /**
   * get current state context of blockchain using last ten blocks
   */
  public getStateContext = async () => {
    try {
      const lastBlocks = await this.client.getLastHeaders(10);

      const lastBlocksStrings = lastBlocks.map((header) =>
        JsonBigInt.stringify(header),
      );
      const lastBlocksHeaders = BlockHeaders.from_json(lastBlocksStrings);
      const lastBlockPreHeader = ergoLib.PreHeader.from_block_header(
        lastBlocksHeaders.get(0),
      );

      const stateContext = new ErgoStateContext(
        lastBlockPreHeader,
        lastBlocksHeaders,
      );

      return stateContext;
    } catch (error) {
      return handleApiError(
        error,
        'Failed to get state context from Ergo Node:',
      );
    }
  };

  /**
   * check if a box is unspent and valid (that is, exists in the blockchain)
   * @param boxId
   */
  public isBoxUnspentAndValid = async (boxId: string) => {
    try {
      const box = await this.client.getIndexedBoxById(boxId);
      this.logger.debug(
        `requested 'getIndexedBoxById' for boxId [${boxId}]. res: ${JsonBigInt.stringify(
          box,
        )}`,
      );

      return !box.spentTransactionId;
    } catch (error) {
      const baseError =
        'Failed to check if box is unspent and valid using Ergo Node:';
      return handleApiError(error, baseError, {
        handleRespondedState: (error) => {
          if (error.response.status === 404) return false;
          throw new FailedError(
            `${baseError} [${error.response.status}] ${error.response.data.reason}`,
          );
        },
      });
    }
  };

  /**
   * gets box by id
   * @param boxId
   * @returns the ergo box
   */
  getBox = async (boxId: string): Promise<ergoLib.ErgoBox> => {
    try {
      const box = await this.client.getIndexedBoxById(boxId);
      this.logger.debug(
        `requested 'getIndexedBoxById' for boxId [${boxId}]. res: ${JsonBigInt.stringify(
          box,
        )}`,
      );

      return ergoLib.ErgoBox.from_json(JsonBigInt.stringify(box));
    } catch (error: any) {
      return handleApiError(
        error,
        `Failed to get box [${boxId}] from Ergo Node:`,
      );
    }
  };

  /**
   * gets token details (name, decimals)
   * @param tokenId
   */
  getTokenDetail = async (tokenId: string): Promise<TokenDetail> => {
    try {
      const tokenDetail = await this.client.getTokenById(tokenId);
      this.logger.debug(
        `requested 'getTokenById' for boxId [${tokenId}]. res: ${JsonBigInt.stringify(
          tokenDetail,
        )}`,
      );

      return {
        tokenId: tokenId,
        name: tokenDetail.name ?? UNKNOWN_TOKEN,
        decimals: tokenDetail.decimals ?? 0,
      };
    } catch (error: any) {
      return handleApiError(
        error,
        `Failed to get token [${tokenId}] info from Ergo Node:`,
      );
    }
  };
}

export default ErgoNodeNetwork;
