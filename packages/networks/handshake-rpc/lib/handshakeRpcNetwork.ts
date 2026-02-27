import { randomBytes } from 'crypto';
import { MTX } from 'hsd';

import { AbstractLogger } from '@rosen-bridge/abstract-logger';
import JsonBigInt from '@rosen-bridge/json-bigint';
import {
  AssetBalance,
  BlockInfo,
  FailedError,
  NetworkError,
  UnexpectedApiError,
} from '@rosen-chains/abstract-chain';
import {
  PartialHandshakeNetwork,
  HandshakeNetworkFunction,
  HandshakeTx,
  HandshakeUtxo,
  CONFIRMATION_TARGET,
} from '@rosen-chains/handshake';
import RateLimitedAxios from '@rosen-clients/rate-limited-axios';

import {
  HandshakeRpcTransaction,
  JsonRpcResult,
  HandshakeBlockSummary,
  HandshakeChainInfo,
  RpcAuth,
  HandshakeCoin,
} from './types';

class HandshakeRpcNetwork extends PartialHandshakeNetwork {
  protected client; // Node RPC client (port 12037)

  // List of functions this class implements from HandshakeNetworkFunction
  readonly implements = [
    HandshakeNetworkFunction.getHeight,
    HandshakeNetworkFunction.getTxConfirmation,
    HandshakeNetworkFunction.getAddressAssets,
    HandshakeNetworkFunction.getBlockTransactionIds,
    HandshakeNetworkFunction.getBlockInfo,
    HandshakeNetworkFunction.getTransaction,
    HandshakeNetworkFunction.submitTransaction,
    HandshakeNetworkFunction.getAddressBoxes,
    HandshakeNetworkFunction.isBoxUnspentAndValid,
    HandshakeNetworkFunction.getUtxo,
    HandshakeNetworkFunction.getFeeRatio,
    HandshakeNetworkFunction.getMempoolTxIds,
  ] as HandshakeNetworkFunction[];

  constructor(url: string, logger?: AbstractLogger, auth?: RpcAuth) {
    super(logger);

    const headers = { 'Content-Type': 'application/json' };

    // Add API key to headers if provided
    if (auth?.apiKey) {
      Object.assign(headers, { 'x-api-key': auth.apiKey });
    }

    const authConfig =
      auth?.username || auth?.password
        ? {
            auth: {
              username: auth?.username || '',
              password: auth?.password || '',
            },
          }
        : {};

    // Node RPC client for blockchain operations
    this.client = RateLimitedAxios.create({
      baseURL: url,
      headers: headers,
      ...authConfig,
    });
  }

  private generateRandomId = () => randomBytes(32).toString('hex');

  /**
   * Validates that the response ID matches the request ID
   * @param requestId the request ID
   * @param responseId the response ID
   * @throws UnexpectedApiError if IDs don't match
   */
  protected validateResponseId = (
    requestId: string,
    responseId: string,
  ): void => {
    if (responseId !== requestId) {
      throw new UnexpectedApiError(
        `Request and response id are different ['${requestId}' != '${responseId}']`,
      );
    }
  };

  /**
   * Converts HNS value to dollarydoos using string manipulation to avoid floating-point issues
   * @param value HNS value as a number
   * @returns dollarydoos as a bigint
   */
  protected convertDollarydoos = (value: number): bigint => {
    const parts = value.toString().split('.');
    const part1 = ((parts[1] ?? '') + '0'.repeat(6)).substring(0, 6);
    return BigInt((parts[0] === '0' ? '' : parts[0]) + part1);
  };

  /**
   * gets the blockchain height
   * @returns the blockchain height
   */
  getHeight = async (): Promise<number> => {
    const randomId = this.generateRandomId();
    try {
      const response = await this.client.post<JsonRpcResult>('', {
        method: 'getblockchaininfo',
        id: randomId,
        params: [],
      });

      this.validateResponseId(randomId, response.data.id);

      const chainInfo: HandshakeChainInfo = response.data.result;
      this.logger?.debug(
        `Requested 'getblockchaininfo'. Response: ${JsonBigInt.stringify(
          chainInfo,
        )}`,
      );

      return chainInfo.blocks;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (e: any) {
      const baseError = `Failed to fetch current height from Handshake RPC: `;
      if (e.response) {
        throw new FailedError(
          baseError + `${JsonBigInt.stringify(e.response.data)}`,
        );
      } else if (e.request) {
        throw new NetworkError(baseError + e.message);
      } else {
        throw new UnexpectedApiError(baseError + e.message);
      }
    }
  };

  /**
   * gets id of all transactions in the given block
   * @param blockId the block id
   * @returns list of the transaction ids in the block
   */
  getBlockTransactionIds = async (blockId: string): Promise<Array<string>> => {
    const randomId = this.generateRandomId();
    try {
      const response = await this.client.post<JsonRpcResult>('', {
        method: 'getblock',
        id: randomId,
        params: [blockId, true, false],
      });

      this.validateResponseId(randomId, response.data.id);

      const blockData: HandshakeBlockSummary = response.data.result;
      this.logger?.debug(
        `Requested 'getblock' for blockId [${blockId}]. Response: ${JsonBigInt.stringify(
          blockData,
        )}`,
      );

      return blockData.tx;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (e: any) {
      const baseError = `Failed to get block [${blockId}] transaction ids from Handshake RPC: `;
      if (e.response) {
        throw new FailedError(
          baseError + JsonBigInt.stringify(e.response.data),
        );
      } else if (e.request) {
        throw new NetworkError(baseError + e.message);
      } else {
        throw new UnexpectedApiError(baseError + e.message);
      }
    }
  };

  /**
   * gets info of the given block
   * @param blockId the block id
   * @returns the block info
   */
  getBlockInfo = async (blockId: string): Promise<BlockInfo> => {
    const randomId = this.generateRandomId();
    try {
      const response = await this.client.post<JsonRpcResult>('', {
        method: 'getblock',
        id: randomId,
        params: [blockId],
      });

      this.validateResponseId(randomId, response.data.id);

      const blockData: HandshakeBlockSummary = response.data.result;
      this.logger?.debug(
        `Requested 'getblock' for blockId [${blockId}]. Response: ${JsonBigInt.stringify(
          blockData,
        )}`,
      );

      return {
        hash: blockData.hash,
        parentHash: blockData.previousblockhash,
        height: blockData.height,
      };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (e: any) {
      const baseError = `Failed to get block [${blockId}] info from Handshake RPC: `;
      if (e.response) {
        throw new FailedError(
          baseError + JsonBigInt.stringify(e.response.data),
        );
      } else if (e.request) {
        throw new NetworkError(baseError + e.message);
      } else {
        throw new UnexpectedApiError(baseError + e.message);
      }
    }
  };

  /**
   * gets a transaction
   * @param transactionId the transaction id
   * @param blockId the block id
   * @returns the transaction
   */
  getTransaction = async (
    transactionId: string,
    blockId: string,
  ): Promise<HandshakeTx> => {
    const randomId = this.generateRandomId();
    try {
      const response = await this.client.post<JsonRpcResult>('', {
        method: 'getrawtransaction',
        id: randomId,
        params: [transactionId, true],
      });

      this.validateResponseId(randomId, response.data.id);

      const tx: HandshakeRpcTransaction = response.data.result;
      this.logger?.debug(
        `Requested 'getrawtransaction' for txId [${transactionId}]. Response: ${JsonBigInt.stringify(
          tx,
        )}`,
      );

      // Validate block hash matches
      if (tx.blockhash !== blockId) {
        throw new FailedError(
          `Transaction [${transactionId}] is in block [${tx.blockhash}], not in requested block [${blockId}]`,
        );
      }

      // Filter outputs (only keep covenant type 0 = NONE and 7 = UPDATE)
      // Transform the RPC transaction to the expected HandshakeTx format
      const handshakeTx: HandshakeTx = {
        id: tx.txid,
        inputs: tx.vin
          .filter((input) => !input.coinbase)
          .map((input) => ({
            txId: input.txid,
            index: input.vout,
          })),
        outputs: tx.vout
          .filter(
            (output) =>
              output.covenant.type === 7 || output.covenant.type === 0,
          ) // Only 7 covenant (UPDATE) and 0 covenant (HNS)
          .map((output) => ({
            value: this.convertDollarydoos(output.value),
            address: output.address || {
              version: 0,
              hash: '',
              string: '',
            },
            covenant: output.covenant || {
              type: 0,
              action: 'NONE',
              items: [],
            },
          })),
      };

      return handshakeTx;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (e: any) {
      // Re-throw if it's already a FailedError (from block validation above)
      if (e instanceof FailedError) {
        throw e;
      }

      const baseError = `Failed to get transaction [${transactionId}] from Handshake RPC: `;
      if (e.response) {
        throw new FailedError(
          baseError + JsonBigInt.stringify(e.response.data),
        );
      } else if (e.request) {
        throw new NetworkError(baseError + e.message);
      } else {
        throw new UnexpectedApiError(baseError + e.message);
      }
    }
  };

  /**
   * submits a transaction
   * @param transaction the transaction
   */
  submitTransaction = async (transaction: MTX): Promise<void> => {
    // Extract the raw transaction hex
    const txHex = transaction.toRaw().toString('hex');

    const randomId = this.generateRandomId();
    try {
      const response = await this.client.post<JsonRpcResult>('', {
        method: 'sendrawtransaction',
        id: randomId,
        params: [txHex],
      });

      this.validateResponseId(randomId, response.data.id);

      this.logger?.debug(
        `Submitted transaction. Response: ${JsonBigInt.stringify(
          response.data,
        )}`,
      );
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (e: any) {
      const baseError = `Failed to submit transaction to Handshake RPC: `;
      if (e.response) {
        throw new FailedError(
          baseError + JsonBigInt.stringify(e.response.data),
        );
      } else if (e.request) {
        throw new NetworkError(baseError + e.message);
      } else {
        throw new UnexpectedApiError(baseError + e.message);
      }
    }
  };

  /**
   * checks if a box is unspent and valid
   * @param boxId the box id
   * @returns true if the box is unspent and valid
   */
  isBoxUnspentAndValid = async (boxId: string): Promise<boolean> => {
    const [txId, outputIndexStr] = boxId.split('.');
    const outputIndex = parseInt(outputIndexStr);

    const randomId = this.generateRandomId();
    try {
      // Check if the output is spent
      const listUnspentResponse = await this.client.post<JsonRpcResult>('', {
        method: 'gettxout',
        id: randomId,
        params: [txId, outputIndex, false], // txid, n, include_mempool
      });

      this.validateResponseId(randomId, listUnspentResponse.data.id);

      // If the result is null, the output is spent
      // Also check if it's a coin output (covenant type 0)
      const result = listUnspentResponse.data.result;
      if (result === null) return false;

      // Check if it's a regular coin output (not a name-related covenant)
      if (result.covenant && result.covenant.type !== 0) return false;

      return true;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (e: any) {
      const baseError = `Failed to check if box [${boxId}] is unspent from Handshake RPC: `;
      if (e.response && e.response.data && e.response.data.error) {
        if (e.response.data.error.code === -5) {
          // No such transaction error
          return false;
        }
        throw new FailedError(
          baseError + JsonBigInt.stringify(e.response.data),
        );
      } else if (e.request) {
        throw new NetworkError(baseError + e.message);
      } else {
        throw new UnexpectedApiError(baseError + e.message);
      }
    }
  };

  /**
   * gets a utxo
   * @param boxId the box id
   * @returns the utxo
   */
  getUtxo = async (boxId: string): Promise<HandshakeUtxo> => {
    const [txId, outputIndexStr] = boxId.split('.');
    const outputIndex = parseInt(outputIndexStr);

    const randomId = this.generateRandomId();
    try {
      // Get the transaction to extract the UTXO information
      const txResponse = await this.client.post<JsonRpcResult>('', {
        method: 'getrawtransaction',
        id: randomId,
        params: [txId, true],
      });

      this.validateResponseId(randomId, txResponse.data.id);

      const tx: HandshakeRpcTransaction = txResponse.data.result;

      if (!tx || outputIndex >= tx.vout.length) {
        throw new FailedError(`UTXO with boxId [${boxId}] not found`);
      }

      const output = tx.vout[outputIndex];

      // Only return coin outputs (covenant type 0)
      if (output.covenant.type !== 0) {
        throw new FailedError(
          `UTXO with boxId [${boxId}] is not a coin output (covenant type: ${output.covenant.type})`,
        );
      }

      return {
        txId: txId,
        index: outputIndex,
        value: this.convertDollarydoos(output.value),
      };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (e: any) {
      // Re-throw if it's already a FailedError (from validation above)
      if (e instanceof FailedError) {
        throw e;
      }

      const baseError = `Failed to get UTXO [${boxId}] from Handshake RPC: `;
      if (e.response) {
        throw new FailedError(
          baseError + JsonBigInt.stringify(e.response.data),
        );
      } else if (e.request) {
        throw new NetworkError(baseError + e.message);
      } else {
        throw new UnexpectedApiError(baseError + e.message);
      }
    }
  };

  /**
   * gets the fee ratio
   * @returns the fee ratio in dollarydoos/vB
   */
  getFeeRatio = async (): Promise<number> => {
    const randomId = this.generateRandomId();
    try {
      const response = await this.client.post<JsonRpcResult>('', {
        method: 'estimatefee',
        id: randomId,
        params: [CONFIRMATION_TARGET], // Number of blocks to target for confirmation
      });

      this.validateResponseId(randomId, response.data.id);
      let feeRate = response.data.result;

      this.logger?.debug(
        `Requested 'estimatefee'. Response: ${JsonBigInt.stringify(
          response.data.result,
        )}`,
      );

      // estimatefee returns -1 if it can't estimate (insufficient historical data)
      if (feeRate === -1 || feeRate <= 0) {
        // use standard hardcoded value ( https://github.com/kyokan/bob-extension/blob/8fbf7c3ef171df340b05021d6f29de0c2e844b0e/src/ui/pages/SendTx/index.tsx#L20-L24 )
        feeRate = 0.05;
      }

      // Convert from HNS/kB (1000 bytes) to dollarydoos/vB.
      const feeDollarydoos = this.convertDollarydoos(feeRate);
      const feePerVByte = Number(feeDollarydoos) / 1000;

      return feePerVByte;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (e: any) {
      const baseError = `Failed to get fee ratio from Handshake RPC: `;
      if (e.response) {
        throw new FailedError(
          baseError + JsonBigInt.stringify(e.response.data),
        );
      } else if (e.request) {
        throw new NetworkError(baseError + e.message);
      } else {
        throw new UnexpectedApiError(baseError + e.message);
      }
    }
  };

  /**
   * gets the amount of each asset in an address
   * @param address the address
   * @returns an object containing the amount of each asset
   */
  getAddressAssets = async (address: string): Promise<AssetBalance> => {
    try {
      const coins = (
        await this.client.get<Array<HandshakeCoin>>(`/coin/address/${address}`)
      ).data;

      // Sum only regular coin values (covenant type 0) to get total HNS balance
      const totalBalance = coins
        .filter((coin) => coin.covenant.type === 0)
        .reduce((sum, coin) => sum + this.convertDollarydoos(coin.value), 0n);

      this.logger?.debug(
        `Requested 'getAddressAssets' for address [${address}]. Balance: ${totalBalance}`,
      );

      return {
        nativeToken: totalBalance,
        tokens: [],
      };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (e: any) {
      const baseError = `Failed to get address [${address}] assets from Handshake: `;
      if (e.response) {
        throw new FailedError(
          baseError + JsonBigInt.stringify(e.response.data),
        );
      } else if (e.request) {
        throw new NetworkError(baseError + e.message);
      } else {
        throw new UnexpectedApiError(baseError + e.message);
      }
    }
  };

  /**
   * gets confirmed and unspent boxes of an address
   * @param address the address
   * @param offset the offset for pagination
   * @param limit the limit for pagination
   * @returns list of boxes
   */
  getAddressBoxes = async (
    address: string,
    offset: number,
    limit: number,
  ): Promise<Array<HandshakeUtxo>> => {
    try {
      const coins = (
        await this.client.get<Array<HandshakeCoin>>(`/coin/address/${address}`)
      ).data;

      // Filter to only include regular coin outputs (covenant type 0)
      const boxes: HandshakeUtxo[] = coins
        .filter((coin) => coin.covenant.type === 0)
        .map((coin) => ({
          txId: coin.hash,
          index: coin.index,
          value: this.convertDollarydoos(coin.value),
        }));

      // Sort boxes to keep consistency between calls
      boxes.sort((a, b) => {
        if (a.txId < b.txId) return -1;
        else if (a.txId === b.txId && a.index < b.index) return -1;
        else if (a.txId === b.txId && a.index === b.index) return 0;
        else return 1;
      });

      this.logger?.debug(
        `Requested 'getAddressBoxes' for address [${address}]. Found ${boxes.length} boxes, returning ${Math.min(
          limit,
          Math.max(0, boxes.length - offset),
        )} boxes (offset: ${offset}, limit: ${limit})`,
      );

      return boxes.slice(offset, offset + limit);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (e: any) {
      const baseError = `Failed to get address [${address}] boxes from Handshake: `;
      if (e.response) {
        throw new FailedError(
          baseError + JsonBigInt.stringify(e.response.data),
        );
      } else if (e.request) {
        throw new NetworkError(baseError + e.message);
      } else {
        throw new UnexpectedApiError(baseError + e.message);
      }
    }
  };

  /**
   * gets id of transactions in mempool
   * @returns list of transaction ids in mempool
   */
  getMempoolTxIds = async (): Promise<Array<string>> => {
    const randomId = this.generateRandomId();
    try {
      const response = await this.client.post<JsonRpcResult>('', {
        method: 'getrawmempool',
        id: randomId,
        params: [false], // verbose = false, just return tx ids
      });

      this.validateResponseId(randomId, response.data.id);

      const txIds: string[] = response.data.result;
      this.logger?.debug(
        `Requested 'getrawmempool'. Found ${txIds.length} transactions`,
      );

      return txIds;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (e: any) {
      const baseError = `Failed to get mempool tx ids from Handshake RPC: `;
      if (e.response) {
        throw new FailedError(
          baseError + JsonBigInt.stringify(e.response.data),
        );
      } else if (e.request) {
        throw new NetworkError(baseError + e.message);
      } else {
        throw new UnexpectedApiError(baseError + e.message);
      }
    }
  };

  /**
   * gets the confirmation of a transaction
   * @param transactionId the transaction id
   * @returns the number of confirmations
   */
  getTxConfirmation = async (transactionId: string): Promise<number> => {
    const randomId = this.generateRandomId();
    try {
      const currentHeight = await this.getHeight();

      const response = await this.client.post<JsonRpcResult>('', {
        method: 'getrawtransaction',
        id: randomId,
        params: [transactionId, true],
      });

      this.validateResponseId(randomId, response.data.id);

      const tx: HandshakeRpcTransaction = response.data.result;

      // If tx is not in a block, return -1
      if (!tx.blockheight) return -1;

      return currentHeight - tx.blockheight + 1;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (e: any) {
      // If transaction is not found (404 or code -5), return -1
      if (e.response && e.response.status === 404) {
        return -1;
      }
      if (
        e.response &&
        e.response.data &&
        e.response.data.error &&
        e.response.data.error.code === -5
      ) {
        return -1;
      }

      const baseError = `Failed to get tx confirmation for [${transactionId}] from Handshake RPC: `;
      if (e.response) {
        throw new FailedError(
          baseError + JsonBigInt.stringify(e.response.data),
        );
      } else if (e.request) {
        throw new NetworkError(baseError + e.message);
      } else {
        throw new UnexpectedApiError(baseError + e.message);
      }
    }
  };
}

export default HandshakeRpcNetwork;
