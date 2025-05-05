import { AbstractLogger } from '@rosen-bridge/abstract-logger';
import {
  AssetBalance,
  BlockInfo,
  FailedError,
  NetworkError,
  PaymentTransaction,
  UnexpectedApiError,
} from '@rosen-chains/abstract-chain';
import JsonBigInt from '@rosen-bridge/json-bigint';
import {
  PartialDogeNetwork,
  DogeNetworkFunction,
  DogeTx,
  DogeUtxo,
} from '@rosen-chains/doge';
import axios, { AxiosInstance } from 'axios';
import { Psbt } from 'bitcoinjs-lib';
import { randomBytes } from 'crypto';
import {
  DogeRpcTransaction,
  JsonRpcResult,
  DogeBlockSummary,
  DogeChainInfo,
} from './types';

class DogeRpcNetwork extends PartialDogeNetwork {
  protected client: AxiosInstance;
  private readonly url: string;
  private readonly timeout: number;
  private getSavedTransactionById: (
    txId: string
  ) => Promise<PaymentTransaction | undefined>;

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

  constructor(
    url: string,
    timeout: number,
    getSavedTransactionById: (
      txId: string
    ) => Promise<PaymentTransaction | undefined>,
    logger?: AbstractLogger,
    auth?: {
      username: string;
      password: string;
    }
  ) {
    super(logger);
    this.url = url;
    this.timeout = timeout;
    this.getSavedTransactionById = getSavedTransactionById;
    this.client = axios.create({
      baseURL: url,
      timeout: timeout,
      headers: { 'Content-Type': 'application/json' },
      auth: auth,
    });
  }

  private generateRandomId = () => randomBytes(32).toString('hex');

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

      if (response.data.id !== randomId) {
        throw new Error(
          `UnexpectedBehavior: Request and response id are different`
        );
      }

      const chainInfo: DogeChainInfo = response.data.result;
      this.logger?.debug(
        `Requested blockchain height. Response: ${JsonBigInt.stringify(
          chainInfo
        )}`
      );

      return chainInfo.blocks;
    } catch (e: any) {
      const baseError = `Failed to fetch current height from Dogecoin RPC: `;
      if (e.response) {
        throw new FailedError(
          baseError + `${JsonBigInt.stringify(e.response.data)}`
        );
      } else if (e.request) {
        throw new NetworkError(baseError + e.message);
      } else {
        throw new UnexpectedApiError(baseError + e.message);
      }
    }
  };

  /**
   * gets confirmation for a transaction (returns -1 if tx is not mined or found)
   * @param transactionId the transaction id (supports both real signed tx id and unsigned tx id)
   * @returns the transaction confirmation (returns -1 if tx is not mined or found)
   */
  getTxConfirmation = async (transactionId: string): Promise<number> => {
    throw new Error('Not implemented');
  };

  /**
   * gets the amount of each asset in an address
   * @param address the address
   * @returns an object containing the amount of each asset
   */
  getAddressAssets = async (address: string): Promise<AssetBalance> => {
    // Return not implemented as specified in the requirements
    throw new Error('Not implemented');
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

      if (response.data.id !== randomId) {
        throw new Error(
          `UnexpectedBehavior: Request and response id are different`
        );
      }

      const blockData: DogeBlockSummary = response.data.result;
      this.logger?.debug(
        `Requested 'block/:hash/txids' for blockId [${blockId}]. Response: ${JsonBigInt.stringify(
          blockData
        )}`
      );

      return blockData.tx;
    } catch (e: any) {
      const baseError = `Failed to get block [${blockId}] transaction ids from Dogecoin RPC: `;
      if (e.response) {
        throw new FailedError(
          baseError + JsonBigInt.stringify(e.response.data)
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

      if (response.data.id !== randomId) {
        throw new Error(
          `UnexpectedBehavior: Request and response id are different`
        );
      }

      const blockData: DogeBlockSummary = response.data.result;
      this.logger?.debug(
        `Requested 'block' info for blockId [${blockId}]. Response: ${JsonBigInt.stringify(
          blockData
        )}`
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
          baseError + JsonBigInt.stringify(e.response.data)
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
    blockId: string
  ): Promise<DogeTx> => {
    const randomId = this.generateRandomId();
    try {
      const response = await this.client.post<JsonRpcResult>('', {
        method: 'getrawtransaction',
        id: randomId,
        params: [transactionId, true],
      });

      if (response.data.id !== randomId) {
        throw new Error(
          `UnexpectedBehavior: Request and response id are different`
        );
      }

      const tx: DogeRpcTransaction = response.data.result;
      this.logger?.debug(
        `Requested 'transaction' for txId [${transactionId}]. Response: ${JsonBigInt.stringify(
          tx
        )}`
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
          value: BigInt(Math.round(output.value * 100000000)), // Convert DOGE to satoshis
          scriptPubKey: output.scriptPubKey.hex,
        })),
      };

      return dogeTx;
    } catch (e: any) {
      const baseError = `Failed to get transaction [${transactionId}] from Dogecoin RPC: `;
      if (e.response) {
        throw new FailedError(
          baseError + JsonBigInt.stringify(e.response.data)
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
    transaction.finalizeAllInputs();
    const txHex = transaction.extractTransaction().toHex();

    const randomId = this.generateRandomId();
    try {
      const response = await this.client.post<JsonRpcResult>('', {
        method: 'sendrawtransaction',
        id: randomId,
        params: [txHex],
      });

      if (response.data.id !== randomId) {
        throw new Error(
          `UnexpectedBehavior: Request and response id are different`
        );
      }

      this.logger?.debug(
        `Submitted transaction. Response: ${JsonBigInt.stringify(
          response.data
        )}`
      );
    } catch (e: any) {
      const baseError = `Failed to submit transaction to Dogecoin RPC: `;
      if (e.response) {
        throw new FailedError(
          baseError + JsonBigInt.stringify(e.response.data)
        );
      } else if (e.request) {
        throw new NetworkError(baseError + e.message);
      } else {
        throw new UnexpectedApiError(baseError + e.message);
      }
    }
  };

  /**
   * gets boxes of an address
   * @param address address
   * @param offset offset
   * @param limit limit
   */
  getAddressBoxes = async (
    address: string,
    offset: number,
    limit: number
  ): Promise<Array<DogeUtxo>> => {
    throw new Error('Not implemented');
  };

  /**
   * checks if a box is unspent and valid
   * @param boxId the box id
   * @returns true if the box is unspent and valid
   */
  isBoxUnspentAndValid = async (boxId: string): Promise<boolean> => {
    const [txId, outputIndexStr] = boxId.split('_');
    const outputIndex = parseInt(outputIndexStr);

    const randomId = this.generateRandomId();
    try {
      // Check if the output is spent
      const randomId2 = this.generateRandomId();
      const listUnspentResponse = await this.client.post<JsonRpcResult>('', {
        method: 'gettxout',
        id: randomId2,
        params: [txId, outputIndex, true], // txid, n, include_mempool
      });

      if (listUnspentResponse.data.id !== randomId2) {
        throw new Error(
          `UnexpectedBehavior: Request and response id are different`
        );
      }

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
          baseError + JsonBigInt.stringify(e.response.data)
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
    const [txId, outputIndexStr] = boxId.split('_');
    const outputIndex = parseInt(outputIndexStr);

    const randomId = this.generateRandomId();
    try {
      // Get the transaction to extract the UTXO information
      const txResponse = await this.client.post<JsonRpcResult>('', {
        method: 'getrawtransaction',
        id: randomId,
        params: [txId, true],
      });

      if (txResponse.data.id !== randomId) {
        throw new Error(
          `UnexpectedBehavior: Request and response id are different`
        );
      }

      const tx: DogeRpcTransaction = txResponse.data.result;

      if (!tx || outputIndex >= tx.vout.length) {
        throw new Error(`UTXO with boxId [${boxId}] not found`);
      }

      const output = tx.vout[outputIndex];

      // Get the confirmation status
      const randomId2 = this.generateRandomId();
      const txOutResponse = await this.client.post<JsonRpcResult>('', {
        method: 'gettxout',
        id: randomId2,
        params: [txId, outputIndex, true], // txid, n, include_mempool
      });

      if (txOutResponse.data.id !== randomId2) {
        throw new Error(
          `UnexpectedBehavior: Request and response id are different`
        );
      }

      // If gettxout returns null, the output is spent
      if (txOutResponse.data.result === null) {
        throw new Error(`UTXO with boxId [${boxId}] is spent`);
      }

      return {
        txId: txId,
        index: outputIndex,
        value: BigInt(Math.round(output.value * 100000000)), // Convert DOGE to satoshis
      };
    } catch (e: any) {
      const baseError = `Failed to get UTXO [${boxId}] from Dogecoin RPC: `;
      if (e.response) {
        throw new FailedError(
          baseError + JsonBigInt.stringify(e.response.data)
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
        params: [10], // Number of blocks to target for confirmation
      });

      if (response.data.id !== randomId) {
        throw new Error(
          `UnexpectedBehavior: Request and response id are different`
        );
      }

      // If there's an error or no feerate, use a default value
      if (
        response.data.error ||
        !response.data.result ||
        !response.data.result.feerate
      ) {
        this.logger?.debug(
          `Failed to get fee estimate, using default. Response: ${JsonBigInt.stringify(
            response.data
          )}`
        );
        return 1000; // Default fee in Dogecoin
      }

      // Convert DOGE/kB to satoshis/byte and round up
      const feeRate = Math.ceil(
        (response.data.result.feerate * 100000000) / 1024
      );
      this.logger?.debug(
        `Requested fee ratio. Response: ${JsonBigInt.stringify(
          response.data.result
        )}`
      );

      return feeRate;
    } catch (e: any) {
      const baseError = `Failed to get fee ratio from Dogecoin RPC: `;
      if (e.response) {
        throw new FailedError(
          baseError + JsonBigInt.stringify(e.response.data)
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

      if (response.data.id !== randomId) {
        throw new Error(
          `UnexpectedBehavior: Request and response id are different`
        );
      }

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
          baseError + JsonBigInt.stringify(e.response.data)
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

      if (response.data.id !== randomId) {
        throw new Error(
          `UnexpectedBehavior: Request and response id are different`
        );
      }

      const txHex: string = response.data.result;
      this.logger?.debug(`Requested transaction hex for txId [${txId}].`);

      return txHex;
    } catch (e: any) {
      const baseError = `Failed to get transaction hex [${txId}] from Dogecoin RPC: `;
      if (e.response) {
        throw new FailedError(
          baseError + JsonBigInt.stringify(e.response.data)
        );
      } else if (e.request) {
        throw new NetworkError(baseError + e.message);
      } else {
        throw new UnexpectedApiError(baseError + e.message);
      }
    }
  };

  /**
   * Returns a spent transaction that has spent the UTXO specified by txId:index
   * @param index index of output
   * @param txId transaction id
   */
  getSpentTransactionByInputId = async (
    index: number,
    txId: string
  ): Promise<DogeTx | undefined> => {
    // This functionality is not directly supported by the Dogecoin RPC API without additional indexing
    throw new Error('Not implemented');
  };
}

export default DogeRpcNetwork;
