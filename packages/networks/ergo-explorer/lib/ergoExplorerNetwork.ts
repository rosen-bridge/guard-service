import * as ergoLib from 'ergo-lib-wasm-nodejs';
import all from 'it-all';

import { AbstractLogger } from '@rosen-bridge/abstract-logger';
import JsonBigInt from '@rosen-bridge/json-bigint';
import {
  FailedError,
  TokenDetail,
  UNKNOWN_TOKEN,
  UnexpectedApiError,
} from '@rosen-chains/abstract-chain';
import { AbstractErgoNetwork } from '@rosen-chains/ergo';
import ergoExplorerClientFactory, {
  V0,
  V1,
} from '@rosen-clients/ergo-explorer';

import handleApiError from './handleApiError';

const TX_FETCHING_PAGE_SIZE = 50;
const BOX_FETCHING_PAGE_SIZE = 50;
const errorCause = {
  EMPTY_TRANSACTIONS: 'empty-transactions',
  NO_BLOCK_HEADERS: 'no-block-headers',
};

interface ErgoExplorerNetworkOptions {
  logger?: AbstractLogger;
  explorerBaseUrl: string;
}

interface ErgoLibSerializableObject {
  sigma_serialize_bytes: () => Uint8Array;
}

class ErgoExplorerNetwork extends AbstractErgoNetwork {
  private client: ReturnType<typeof ergoExplorerClientFactory>;

  constructor({ logger, explorerBaseUrl }: ErgoExplorerNetworkOptions) {
    super(logger);
    this.client = ergoExplorerClientFactory(explorerBaseUrl);
  }

  /**
   * get current block height
   */
  public getHeight = async () => {
    try {
      const state = await this.client.v1.getApiV1Networkstate();
      this.logger.debug(
        `requested 'getApiV1Networkstate'. res: ${JsonBigInt.stringify(state)}`,
      );
      return Number(state.height);
    } catch (error) {
      return handleApiError(error, 'Failed to get height from Ergo Explorer:');
    }
  };

  /**
   * get confirmations of a tx or -1 if tx is not in the blockchain
   * @param txId
   */
  public getTxConfirmation = async (txId: string) => {
    try {
      const tx = await this.client.v1.getApiV1TransactionsP1(txId);
      this.logger.debug(
        `requested 'getApiV1TransactionsP1' for txId [${txId}]. res: ${JsonBigInt.stringify(
          tx,
        )}`,
      );
      return Number(tx.numConfirmations);
    } catch (error) {
      const baseError = 'Failed to get tx confirmations from Ergo Explorer:';
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
      const balance =
        await this.client.v1.getApiV1AddressesP1BalanceConfirmed(address);
      this.logger.debug(
        `requested 'getApiV1AddressesP1BalanceConfirmed' for address [${address}]. res: ${JsonBigInt.stringify(
          balance,
        )}`,
      );

      return {
        nativeToken: balance.nanoErgs,
        tokens:
          balance.tokens?.map((token) => ({
            id: token.tokenId,
            value: token.amount,
          })) ?? [],
      };
    } catch (error) {
      return handleApiError(
        error,
        'Failed to get address assets from Ergo Explorer:',
      );
    }
  };

  /**
   * get all tx ids of a block
   * @param blockId
   */
  public getBlockTransactionIds = async (blockId: string) => {
    try {
      const {
        block: { blockTransactions },
      } = await this.client.v1.getApiV1BlocksP1(blockId);

      if (!blockTransactions) {
        throw new Error(
          `No transactions found in block [${blockId}]. This may be an issue with the api, because it is not possible to have a block without any transactions.`,
          {
            cause: errorCause.EMPTY_TRANSACTIONS,
          },
        );
      }

      const txIds = blockTransactions.map((tx) => tx.id);
      this.logger.debug(
        `requested block transaction ids with 'getApiV1BlocksP1' for blockId [${blockId}]. res: ${JsonBigInt.stringify(
          txIds,
        )}`,
      );

      return txIds;
    } catch (error) {
      const baseError =
        'Failed to get block transaction ids from Ergo Explorer:';
      return handleApiError(error, baseError, {
        handleRespondedState: (error) => {
          if (error.response.status === 404) return [] as string[];
          throw new FailedError(
            `${baseError} [${error.response.status}] ${error.response.data.reason}`,
          );
        },
        handleUnknownState: (error) => {
          if (error.cause === errorCause.EMPTY_TRANSACTIONS) {
            throw new FailedError(`${baseError} ${error.message}`);
          }
          throw new UnexpectedApiError(`${baseError} ${error.message}`);
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
      const {
        block: { header },
      } = await this.client.v1.getApiV1BlocksP1(blockId);
      this.logger.debug(
        `requested block header with 'getApiV1BlocksP1' for blockId [${blockId}]. res: ${JsonBigInt.stringify(
          header,
        )}`,
      );
      return {
        hash: blockId,
        parentHash: header.parentId,
        height: Number(header.height),
      };
    } catch (error) {
      return handleApiError(
        error,
        'Failed to get block info from Ergo Explorer:',
      );
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
   * Fix a possible malformed tx (returned by `getApiV1TransactionsP1` api),
   * converting all `null` values for `spendingProof` to an empty string
   * @param tx
   */
  private fixMalformedTx = (tx: V1.TransactionInfo) => ({
    ...tx,
    inputs: tx.inputs?.map((input) => ({
      ...input,
      spendingProof: input.spendingProof || '',
    })),
  });

  /**
   * get a transaction by its id, returning tx or throw an error if the tx doesn't belong to the block
   * @param txId
   * @param blockId
   */
  public getTransaction = async (txId: string, blockId: string) => {
    try {
      const possibleMalformedTx =
        await this.client.v1.getApiV1TransactionsP1(txId);
      this.logger.debug(
        `requested 'getApiV1TransactionsP1' for txId [${txId}] and blockId [${blockId}]. res: ${JsonBigInt.stringify(
          possibleMalformedTx,
        )}`,
      );
      /**
       * The following conversion is needed because the api result of explorer may
       * include `null` values for `spendingProof`, but it causes ergo-lib api to
       * crash.
       */
      const tx = this.fixMalformedTx(possibleMalformedTx);

      if (tx.blockId !== blockId) {
        throw new Error(`Tx [${txId}] doesn't belong to block [${blockId}]`);
      }

      return ergoLib.Transaction.from_json(JsonBigInt.stringify(tx));
    } catch (error) {
      return handleApiError(error, 'Failed to get tx from Ergo Explorer:');
    }
  };

  /**
   * submit a transaction to the network
   * @param tx the transaction
   */
  public submitTransaction = async (tx: ergoLib.Transaction) => {
    try {
      await this.client.v0.postApiV0TransactionsSend(tx.to_js_eip12());
      return;
    } catch (error) {
      return handleApiError(
        error,
        'Failed to submit transaciton to Ergo Explorer:',
      );
    }
  };

  /**
   * Fix a possible malformed mempool tx (returned by
   * `getApiV0TransactionsUnconfirmed` api), converting all `null` values for
   * `spendingProof.proofBytes` to an empty string
   * @param tx
   */
  private fixMalformedMempoolTx = (tx: V0.UTransactionInfo) => ({
    ...tx,
    inputs: tx.inputs?.map((input) => ({
      ...input,
      spendingProof: {
        extension: input.spendingProof.extension,
        proofBytes: input.spendingProof.proofBytes || '',
      },
    })),
  });

  /**
   * get a mempool tx in each iteration until there are no more txs in it
   */
  private async *getOneMempoolTx() {
    let currentPage = 0;

    while (true) {
      const txsPage = await this.client.v0.getApiV0TransactionsUnconfirmed({
        offset: currentPage * TX_FETCHING_PAGE_SIZE,
        limit: TX_FETCHING_PAGE_SIZE,
      });

      if (txsPage.items?.length) {
        yield* txsPage.items;
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
      const mempoolTxIterator = this.getOneMempoolTx();
      const txs = await all(mempoolTxIterator);
      this.logger.debug(
        `requested mempool transactions. res: ${JsonBigInt.stringify(
          txs.map((tx) => tx.id),
        )}`,
      );
      return txs
        .map(this.fixMalformedMempoolTx)
        .map((tx) => ergoLib.Transaction.from_json(JsonBigInt.stringify(tx)));
    } catch (error) {
      return handleApiError(
        error,
        'Failed to get mempool transactions from Ergo Explorer:',
      );
    }
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
  ) => {
    try {
      const res = await this.client.v1.getApiV1BoxesUnspentByaddressP1(
        address,
        {
          offset: offset,
          limit: limit,
        },
      );
      this.logger.debug(
        `requested 'getApiV1BoxesUnspentByaddressP1' for address [${address}]. res: ${JsonBigInt.stringify(
          res,
        )}`,
      );
      const boxes = res.items;

      if (!boxes) {
        return [];
      }

      const boxesBytes = boxes.map((box) =>
        ergoLib.ErgoBox.from_json(JsonBigInt.stringify(box)),
      );

      return boxesBytes;
    } catch (error) {
      return handleApiError(
        error,
        'Failed to get address boxes from Ergo Explorer:',
      );
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
  ) => {
    try {
      const eligibleBoxes: Array<ergoLib.ErgoBox> = [];
      let currentPage = 0;

      while (eligibleBoxes.length < offset + limit) {
        const boxesPage = await this.client.v1.getApiV1BoxesUnspentBytokenidP1(
          tokenId,
          {
            offset: currentPage * BOX_FETCHING_PAGE_SIZE,
            limit: BOX_FETCHING_PAGE_SIZE,
          },
        );
        this.logger.debug(
          `requested 'getApiV1BoxesUnspentBytokenidP1' for tokenId [${tokenId}][page:${currentPage}]. res: ${JsonBigInt.stringify(
            boxesPage,
          )}`,
        );

        if (!boxesPage.items?.length) break;

        eligibleBoxes.push(
          ...boxesPage.items
            .filter((box: V1.OutputInfo) => box.address === address)
            .map((box: V1.OutputInfo) =>
              ergoLib.ErgoBox.from_json(JsonBigInt.stringify(box)),
            ),
        );
        currentPage++;
      }

      return eligibleBoxes.slice(offset, limit);
    } catch (error) {
      return handleApiError(
        error,
        'Failed to get boxes by token id from Ergo Explorer:',
      );
    }
  };

  /**
   * get current state context of blockchain using last ten blocks
   */
  public getStateContext = async () => {
    try {
      const { items: lastBlocks } = await this.client.v1.getApiV1BlocksHeaders({
        offset: 0,
        limit: 10,
      });
      this.logger.debug(
        `requested 'getApiV1BlocksHeaders'. res: ${JsonBigInt.stringify(
          lastBlocks,
        )}`,
      );

      if (!lastBlocks) {
        throw new Error(
          'No block headers returned by the api. This may be an issue with the api, because it is not possible to have no block headers.',
          {
            cause: errorCause.NO_BLOCK_HEADERS,
          },
        );
      }

      const lastBlocksStrings = lastBlocks.map((header) =>
        JsonBigInt.stringify(header),
      );
      const lastBlocksHeaders =
        ergoLib.BlockHeaders.from_json(lastBlocksStrings);
      const lastBlockPreHeader = ergoLib.PreHeader.from_block_header(
        lastBlocksHeaders.get(0),
      );

      const stateContext = new ergoLib.ErgoStateContext(
        lastBlockPreHeader,
        lastBlocksHeaders,
      );

      return stateContext;
    } catch (error) {
      const baseError = 'Failed to get state context from Ergo Explorer:';
      return handleApiError(error, baseError, {
        handleUnknownState: (error) => {
          if (error.cause === errorCause.NO_BLOCK_HEADERS) {
            throw new FailedError(`${baseError} ${error.message}`);
          }
          throw new UnexpectedApiError(`${baseError} ${error.message}`);
        },
      });
    }
  };

  /**
   * check if a box is unspent and valid (that is, exists in the blockchain)
   * @param boxId
   */
  public isBoxUnspentAndValid = async (boxId: string) => {
    try {
      const box = await this.client.v1.getApiV1BoxesP1(boxId);
      this.logger.debug(
        `requested 'getApiV1BoxesP1' for boxId [${boxId}]. res: ${JsonBigInt.stringify(
          box,
        )}`,
      );

      return !box.spentTransactionId;
    } catch (error) {
      const baseError =
        'Failed to check if box is unspent and valid using Ergo Explorer:';
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
      const box = await this.client.v1.getApiV1BoxesP1(boxId);
      this.logger.debug(
        `requested 'getApiV1BoxesP1' for boxId [${boxId}]. res: ${JsonBigInt.stringify(
          box,
        )}`,
      );

      return ergoLib.ErgoBox.from_json(JsonBigInt.stringify(box));
    } catch (error) {
      return handleApiError(
        error,
        `Failed to get box [${boxId}] from Ergo Explorer:`,
      );
    }
  };

  /**
   * gets token details (name, decimals)
   * @param tokenId
   */
  getTokenDetail = async (tokenId: string): Promise<TokenDetail> => {
    try {
      const tokenDetail = await this.client.v1.getApiV1TokensP1(tokenId);
      this.logger.debug(
        `requested 'getApiV1TokensP1' for token [${tokenId}]. index 0: ${JsonBigInt.stringify(
          tokenDetail,
        )}`,
      );

      return {
        tokenId: tokenId,
        name: tokenDetail.name ?? UNKNOWN_TOKEN,
        decimals: tokenDetail.decimals ?? 0,
      };
    } catch (error) {
      return handleApiError(
        error,
        `Failed to get token [${tokenId}] info from Ergo Explorer:`,
      );
    }
  };
}

export default ErgoExplorerNetwork;
