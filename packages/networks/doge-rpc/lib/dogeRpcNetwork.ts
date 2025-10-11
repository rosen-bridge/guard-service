import { Psbt } from 'bitcoinjs-lib';
import { randomBytes } from 'crypto';

import { AbstractLogger } from '@rosen-bridge/abstract-logger';
import JsonBigInt from '@rosen-bridge/json-bigint';
import {
  BlockInfo,
  FailedError,
  NetworkError,
  UnexpectedApiError,
} from '@rosen-chains/abstract-chain';
import {
  PartialDogeNetwork,
  DogeNetworkFunction,
  DogeTx,
  DogeUtxo,
  CONFIRMATION_TARGET,
} from '@rosen-chains/doge';
import RateLimitedAxios from '@rosen-clients/rate-limited-axios';

import {
  DogeRpcTransaction,
  JsonRpcResult,
  DogeBlockSummary,
  DogeChainInfo,
  RpcAuth,
} from './types';

class DogeRpcNetwork extends PartialDogeNetwork {
  protected client; // TODO: specify the type (local:ergo/rosen-bridge/network-client#26)

  // List of functions this class implements from DogeNetworkFunction
  readonly implements = [
    DogeNetworkFunction.getHeight,
    DogeNetworkFunction.getBlockTransactionIds,
    DogeNetworkFunction.getBlockInfo,
    DogeNetworkFunction.getTransaction,
    DogeNetworkFunction.submitTransaction,
    DogeNetworkFunction.isBoxUnspentAndValid,
    DogeNetworkFunction.getUtxo,
    DogeNetworkFunction.getFeeRatio,
    DogeNetworkFunction.isTxInMempool,
    DogeNetworkFunction.getTransactionHex,
  ] as DogeNetworkFunction[];

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
   * Converts DOGE value to satoshis using string manipulation to avoid floating-point issues
   * @param value DOGE value as a number
   * @returns satoshis as a bigint
   */
  protected convertToSatoshis = (value: number): bigint => {
    const parts = value.toString().split('.');
    const part1 = ((parts[1] ?? '') + '0'.repeat(8)).substring(0, 8);
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

      const chainInfo: DogeChainInfo = response.data.result;
      this.logger?.debug(
        `Requested 'getblockchaininfo'. Response: ${JsonBigInt.stringify(
          chainInfo,
        )}`,
      );

      return chainInfo.blocks;
    } catch (e: any) {
      const baseError = `Failed to fetch current height from Dogecoin RPC: `;
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
        params: [blockId, 1],
      });

      this.validateResponseId(randomId, response.data.id);

      const blockData: DogeBlockSummary = response.data.result;
      this.logger?.debug(
        `Requested 'getblock' for blockId [${blockId}]. Response: ${JsonBigInt.stringify(
          blockData,
        )}`,
      );

      return blockData.tx;
    } catch (e: any) {
      const baseError = `Failed to get block [${blockId}] transaction ids from Dogecoin RPC: `;
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
        params: [blockId, 1],
      });

      this.validateResponseId(randomId, response.data.id);

      const blockData: DogeBlockSummary = response.data.result;
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
    } catch (e: any) {
      const baseError = `Failed to get block [${blockId}] info from Dogecoin RPC: `;
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
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    blockId: string,
  ): Promise<DogeTx> => {
    const randomId = this.generateRandomId();
    try {
      const response = await this.client.post<JsonRpcResult>('', {
        method: 'getrawtransaction',
        id: randomId,
        params: [transactionId, true],
      });

      this.validateResponseId(randomId, response.data.id);

      const tx: DogeRpcTransaction = response.data.result;
      this.logger?.debug(
        `Requested 'getrawtransaction' for txId [${transactionId}]. Response: ${JsonBigInt.stringify(
          tx,
        )}`,
      );

      // Transform the RPC transaction to the expected DogeTx format
      const dogeTx: DogeTx = {
        id: tx.txid,
        inputs: tx.vin.map((input) => ({
          txId: input.txid,
          index: input.vout,
          scriptPubKey: input.scriptSig.hex,
        })),
        outputs: tx.vout.map((output) => ({
          value: this.convertToSatoshis(output.value),
          scriptPubKey: output.scriptPubKey.hex,
        })),
      };

      return dogeTx;
    } catch (e: any) {
      const baseError = `Failed to get transaction [${transactionId}] from Dogecoin RPC: `;
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
  submitTransaction = async (transaction: Psbt): Promise<void> => {
    // Extract the raw transaction hex
    const txHex = transaction.extractTransaction(true).toHex();

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
    } catch (e: any) {
      const baseError = `Failed to submit transaction to Dogecoin RPC: `;
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
      return listUnspentResponse.data.result !== null;
    } catch (e: any) {
      const baseError = `Failed to check if box [${boxId}] is unspent from Dogecoin RPC: `;
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
  getUtxo = async (boxId: string): Promise<DogeUtxo> => {
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

      const tx: DogeRpcTransaction = txResponse.data.result;

      if (!tx || outputIndex >= tx.vout.length) {
        throw new FailedError(`UTXO with boxId [${boxId}] not found`);
      }

      const output = tx.vout[outputIndex];

      return {
        txId: txId,
        index: outputIndex,
        value: this.convertToSatoshis(output.value),
      };
    } catch (e: any) {
      const baseError = `Failed to get UTXO [${boxId}] from Dogecoin RPC: `;
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
   * @returns the fee ratio in satoshis/byte
   */
  getFeeRatio = async (): Promise<number> => {
    const randomId = this.generateRandomId();
    try {
      const response = await this.client.post<JsonRpcResult>('', {
        method: 'estimatesmartfee',
        id: randomId,
        params: [CONFIRMATION_TARGET], // Number of blocks to target for confirmation
      });

      this.validateResponseId(randomId, response.data.id);
      const feeSatoshis = this.convertToSatoshis(response.data.result.feerate);
      const feeRate = Number(feeSatoshis) / 1024;

      this.logger?.debug(
        `Requested 'estimatesmartfee'. Response: ${JsonBigInt.stringify(
          response.data.result,
        )}`,
      );
      return Math.ceil(feeRate);
    } catch (e: any) {
      const baseError = `Failed to get fee ratio from Dogecoin RPC: `;
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
   * checks if a transaction is in the mempool
   * @param txId the transaction id
   * @returns true if the transaction is in the mempool
   */
  isTxInMempool = async (txId: string): Promise<boolean> => {
    const randomId = this.generateRandomId();
    try {
      const response = await this.client.post<JsonRpcResult>('', {
        method: 'getmempoolentry',
        id: randomId,
        params: [txId],
      });

      this.validateResponseId(randomId, response.data.id);

      // If we get a successful response, the transaction is in the mempool
      return true;
    } catch (e: any) {
      // If we get a specific error indicating the tx is not in the mempool
      if (e.response && e.response.data && e.response.data.error) {
        if (e.response.data.error.code === -5) {
          // Transaction not in mempool
          return false;
        }
      }

      const baseError = `Failed to check if tx [${txId}] is in mempool from Dogecoin RPC: `;
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
   * gets transaction hex
   * @param txId the transaction id
   * @returns the transaction hex
   */
  getTransactionHex = async (txId: string): Promise<string> => {
    const randomId = this.generateRandomId();
    try {
      const response = await this.client.post<JsonRpcResult>('', {
        method: 'getrawtransaction',
        id: randomId,
        params: [txId, false], // txid, verbose (false = return hex)
      });

      this.validateResponseId(randomId, response.data.id);

      const txHex: string = response.data.result;
      this.logger?.debug(`Requested transaction hex for txId [${txId}].`);

      return txHex;
    } catch (e: any) {
      const baseError = `Failed to get transaction hex [${txId}] from Dogecoin RPC: `;
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

export default DogeRpcNetwork;
