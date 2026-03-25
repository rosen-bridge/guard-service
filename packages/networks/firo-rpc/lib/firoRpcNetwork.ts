import { Psbt } from 'bitcoinjs-lib';
import { randomBytes } from 'crypto';

import { AbstractLogger } from '@rosen-bridge/abstract-logger';
import JsonBigInt from '@rosen-bridge/json-bigint';
import {
  BlockInfo,
  FailedError,
  NetworkError,
  UnexpectedApiError,
  PaymentTransaction,
} from '@rosen-chains/abstract-chain';
import {
  AbstractFiroNetwork,
  FiroTx,
  FiroUtxo,
  CONFIRMATION_TARGET,
  FIRO_NETWORK,
} from '@rosen-chains/firo';
import RateLimitedAxios from '@rosen-clients/rate-limited-axios';

import {
  FiroRpcTransaction,
  JsonRpcResult,
  FiroBlockSummary,
  FiroChainInfo,
  RpcAuth,
  FiroRpcUtxo,
} from './types';

class FiroRpcNetwork extends AbstractFiroNetwork {
  protected client; // TODO: specify the type (local:ergo/rosen-bridge/network-client#26)
  private getSavedTransactionById: (
    txId: string,
  ) => Promise<PaymentTransaction | undefined>;

  constructor(
    url: string,
    getSavedTransactionById: (
      txId: string,
    ) => Promise<PaymentTransaction | undefined>,
    logger?: AbstractLogger,
    auth?: RpcAuth,
  ) {
    super(logger);
    this.getSavedTransactionById = getSavedTransactionById;

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
   * Converts FIRO value to satoshis using string manipulation to avoid floating-point issues
   * @param value FIRO value as a number
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

      const chainInfo: FiroChainInfo = response.data.result;
      this.logger.debug(
        `Requested 'getblockchaininfo'. Response: ${JsonBigInt.stringify(
          chainInfo,
        )}`,
      );

      return chainInfo.blocks;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (e: any) {
      const baseError = `Failed to fetch current height from Firo RPC: `;
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
        params: [blockId, true],
      });

      this.validateResponseId(randomId, response.data.id);

      const blockData: FiroBlockSummary = response.data.result;
      this.logger.debug(
        `Requested 'getblock' for blockId [${blockId}]. Response: ${JsonBigInt.stringify(
          blockData,
        )}`,
      );

      return blockData.tx;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (e: any) {
      const baseError = `Failed to get block [${blockId}] transaction ids from Firo RPC: `;
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
        params: [blockId, true],
      });

      this.validateResponseId(randomId, response.data.id);

      const blockData: FiroBlockSummary = response.data.result;
      this.logger.debug(
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
      const baseError = `Failed to get block [${blockId}] info from Firo RPC: `;
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
  ): Promise<FiroTx> => {
    const randomId = this.generateRandomId();
    try {
      const response = await this.client.post<JsonRpcResult>('', {
        method: 'getrawtransaction',
        id: randomId,
        params: [transactionId, true],
      });

      this.validateResponseId(randomId, response.data.id);

      const tx: FiroRpcTransaction = response.data.result;
      this.logger.debug(
        `Requested 'getrawtransaction' for txId [${transactionId}]. Response: ${JsonBigInt.stringify(
          tx,
        )}`,
      );

      // Transform the RPC transaction to the expected FiroTx format
      const firoTx: FiroTx = {
        id: tx.txid,
        inputs: tx.vin.map((input) => ({
          txId: input.txid || '', // Coinbase txs don't have txid
          index: input.vout ?? -1, // Coinbase txs don't have vout
          scriptPubKey: input.scriptSig?.hex || input.coinbase || '', // Coinbase uses coinbase field
        })),
        outputs: tx.vout.map((output) => ({
          value: this.convertToSatoshis(output.value),
          scriptPubKey: output.scriptPubKey.hex,
        })),
      };

      return firoTx;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (e: any) {
      const baseError = `Failed to get transaction [${transactionId}] from Firo RPC: `;
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

      this.logger.debug(
        `Submitted transaction. Response: ${JsonBigInt.stringify(
          response.data,
        )}`,
      );
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (e: any) {
      const baseError = `Failed to submit transaction to Firo RPC: `;
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
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (e: any) {
      const baseError = `Failed to check if box [${boxId}] is unspent from Firo RPC: `;
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
  getUtxo = async (boxId: string): Promise<FiroUtxo> => {
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

      const tx: FiroRpcTransaction = txResponse.data.result;

      if (!tx || outputIndex >= tx.vout.length) {
        throw new FailedError(`UTXO with boxId [${boxId}] not found`);
      }

      const output = tx.vout[outputIndex];

      return {
        txId: txId,
        index: outputIndex,
        value: this.convertToSatoshis(output.value),
      };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (e: any) {
      const baseError = `Failed to get UTXO [${boxId}] from Firo RPC: `;
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

      this.logger.debug(
        `Requested 'estimatesmartfee'. Response: ${JsonBigInt.stringify(
          response.data.result,
        )}`,
      );
      return Math.ceil(feeRate);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (e: any) {
      const baseError = `Failed to get fee ratio from Firo RPC: `;
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
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (e: any) {
      // If we get a specific error indicating the tx is not in the mempool
      if (e.response && e.response.data && e.response.data.error) {
        if (e.response.data.error.code === -5) {
          // Transaction not in mempool
          return false;
        }
      }

      const baseError = `Failed to check if tx [${txId}] is in mempool from Firo RPC: `;
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
      this.logger.debug(`Requested transaction hex for txId [${txId}].`);

      return txHex;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (e: any) {
      const baseError = `Failed to get transaction hex [${txId}] from Firo RPC: `;
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
   * gets confirmed and unspent UTXOs of an address
   * @param address the address
   * @param offset offset for pagination
   * @param limit maximum number of UTXOs to return
   * @returns list of UTXOs
   */
  getAddressBoxes = async (
    address: string,
    offset: number,
    limit: number,
  ): Promise<Array<FiroUtxo>> => {
    const randomId = this.generateRandomId();
    try {
      // Get list of unspent outputs for the address
      const response = await this.client.post<JsonRpcResult>('', {
        method: 'listunspent',
        id: randomId,
        params: [1, 9999999, [address]], // minconf, maxconf, addresses
      });

      this.validateResponseId(randomId, response.data.id);

      const utxos: Array<FiroRpcUtxo> = response.data.result;

      this.logger.debug(
        `Requested 'listunspent' for address [${address}]. Response: ${JsonBigInt.stringify(
          utxos,
        )}`,
      );

      // Convert to FiroUtxo format and apply pagination
      const firoUtxos = utxos.slice(offset, offset + limit).map((utxo) => ({
        txId: utxo.txid,
        index: utxo.vout,
        value: this.convertToSatoshis(utxo.amount),
      }));

      this.logger.debug(
        `Requested 'listunspent' for address [${address}]. Found ${utxos.length} UTXOs, returning ${firoUtxos.length}.`,
      );

      return firoUtxos;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (e: any) {
      const baseError = `Failed to get address boxes for [${address}] from Firo RPC: `;
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
   * gets the number of confirmations for a transaction (only supports signed tx id)
   * @param transactionId the signed transaction id
   * @returns the number of confirmations
   */
  protected getTxConfirmationSigned = async (
    transactionId: string,
  ): Promise<number> => {
    const randomId = this.generateRandomId();
    try {
      const response = await this.client.post<JsonRpcResult>('', {
        method: 'getrawtransaction',
        id: randomId,
        params: [transactionId, true],
      });

      this.validateResponseId(randomId, response.data.id);

      const tx: FiroRpcTransaction = response.data.result;

      this.logger.debug(
        `Requested 'getrawtransaction' for txId [${transactionId}]. Response: ${JsonBigInt.stringify(
          tx,
        )}`,
      );

      // Return -1 for unconfirmed transactions (confirmations undefined or 0)
      return tx.confirmations && tx.confirmations > 0 ? tx.confirmations : -1;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (e: any) {
      const baseError = `Failed to get transaction confirmations for [${transactionId}] from Firo RPC: `;
      if (e.response && e.response.data && e.response.data.error) {
        if (e.response.data.error.code === -5) {
          // Transaction not found
          this.logger.debug(`tx [${transactionId}] is not found`);
          return -1;
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
   * gets confirmation for a transaction (returns -1 if tx is not mined or found)
   * @param transactionId the transaction id (supports both real signed tx id and unsigned tx id)
   * @returns the transaction confirmation (returns -1 if tx is not mined or found)
   */
  getTxConfirmation = async (transactionId: string): Promise<number> => {
    const realTxId = await this.getActualTxId(transactionId);
    return await this.getTxConfirmationSigned(realTxId);
  };

  /**
   * gets the balance of native assets for an address
   * @param address the address
   * @returns the asset balance (only native token, Firo doesn't support tokens)
   */
  getAddressAssets = async (
    address: string,
  ): Promise<{
    nativeToken: bigint;
    tokens: Array<{ id: string; value: bigint }>;
  }> => {
    const randomId = this.generateRandomId();
    try {
      // Get list of unspent outputs for the address
      const response = await this.client.post<JsonRpcResult>('', {
        method: 'listunspent',
        id: randomId,
        params: [1, 9999999, [address]], // minconf=1 to include only confirmed UTXOs
      });

      this.validateResponseId(randomId, response.data.id);

      const utxos: Array<FiroRpcUtxo> = response.data.result;

      this.logger.debug(
        `Requested 'listunspent' for address [${address}]. Response: ${JsonBigInt.stringify(
          utxos,
        )}`,
      );

      // Sum up all UTXO values
      const totalSatoshis = utxos.reduce(
        (sum, utxo) => sum + this.convertToSatoshis(utxo.amount),
        0n,
      );

      return {
        nativeToken: totalSatoshis,
        tokens: [], // Firo doesn't support tokens
      };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (e: any) {
      const baseError = `Failed to get address assets for [${address}] from Firo RPC: `;
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
   * Attempts to find which transaction spent a specific UTXO using getspentinfo RPC
   * @param index the output index that was spent
   * @param txId the transaction ID containing the output
   * @returns the transaction that spent the UTXO, or undefined if not found
   */
  protected getSpentTransactionByInputId = async (
    index: number,
    txId: string,
  ): Promise<FiroTx | undefined> => {
    try {
      const randomId = this.generateRandomId();
      const response = await this.client.post<JsonRpcResult>('', {
        method: 'getspentinfo',
        id: randomId,
        params: [{ txid: txId, index }],
      });

      this.validateResponseId(randomId, response.data.id);

      const spentInfo = response.data.result;
      this.logger.debug(
        `Requested 'getspentinfo' for utxoId [${txId}.${index}]. Response: ${JsonBigInt.stringify(
          spentInfo,
        )}`,
      );
      if (!spentInfo || !spentInfo.txid) {
        return undefined;
      }

      return this.getTransaction(spentInfo.txid, '');
    } catch (error) {
      this.logger.debug(
        `Failed to find spending transaction for UTXO ${txId}:${index} using getspentinfo: ${error}`,
      );
      return undefined;
    }
  };

  /**
   * Attempts to extract signed transaction ID directly from PSBT
   * @param psbt the PSBT containing the transaction
   * @returns the signed transaction ID, or undefined if extraction fails
   */
  protected extractActualTxIdFromPsbt = async (
    psbt: Psbt,
  ): Promise<string | undefined> => {
    try {
      return psbt.extractTransaction(true).getId();
    } catch (error) {
      this.logger.debug(
        `Failed to extract signed transaction ID from PSBT: ${error}`,
      );
      return undefined;
    }
  };

  /**
   * Attempts to find signed transaction ID using RPC lookup of spending transactions
   * @param psbt the PSBT containing the unsigned transaction
   * @returns the signed transaction ID, or undefined if not found
   */
  protected extractActualTxIdWithRpcLookup = async (
    psbt: Psbt,
  ): Promise<string | undefined> => {
    try {
      if (psbt.txInputs.length === 0) {
        return undefined;
      }

      // Use the first input to find the spending transaction
      const firstInput = psbt.txInputs[0];
      const inputTxId = Buffer.from(firstInput.hash).reverse().toString('hex');
      const inputIndex = firstInput.index;

      const spentTx = await this.getSpentTransactionByInputId(
        inputIndex,
        inputTxId,
      );
      if (!spentTx) {
        return undefined;
      }

      // Verify this is the same transaction by comparing inputs and outputs
      const sameInputs = psbt.txInputs.every(
        (input, i) =>
          spentTx.inputs[i]?.txId ===
            Buffer.from(input.hash).reverse().toString('hex') &&
          spentTx.inputs[i]?.index === input.index,
      );

      const sameOutputs = psbt.txOutputs.every(
        (output, i) =>
          spentTx.outputs[i]?.scriptPubKey ===
            Buffer.from(output.script).toString('hex') &&
          spentTx.outputs[i]?.value === BigInt(output.value),
      );

      if (sameInputs && sameOutputs) {
        return spentTx.id;
      }

      return undefined;
    } catch (error) {
      this.logger.debug(
        `Failed to find signed transaction ID using RPC lookup: ${error}`,
      );
      return undefined;
    }
  };

  /**
   * gets the actual transaction ID from a transaction hash
   * For unsigned transactions, finds the corresponding signed transaction ID
   *
   * Uses a two-stage approach:
   * 1. First attempts direct extraction from PSBT
   * 2. Falls back to RPC-based lookup using Firo's address indexing
   *
   * @param hash the transaction hash (can be unsigned or signed)
   * @returns the actual signed transaction ID
   */
  getActualTxId = async (hash: string): Promise<string> => {
    let actualTxId = hash;
    try {
      const realPaymentTx = await this.getSavedTransactionById(hash);

      if (realPaymentTx) {
        const realTx = Psbt.fromBuffer(Buffer.from(realPaymentTx.txBytes), {
          network: FIRO_NETWORK,
        });

        // Method 1: Try direct PSBT extraction
        const directExtraction = await this.extractActualTxIdFromPsbt(realTx);
        if (directExtraction) {
          actualTxId = directExtraction;
        } else {
          // Method 2: Fallback to RPC lookup
          this.logger.debug(
            `Direct PSBT extraction failed for hash [${hash}], attempting RPC lookup...`,
          );

          const rpcLookup = await this.extractActualTxIdWithRpcLookup(realTx);
          if (rpcLookup) {
            actualTxId = rpcLookup;
          } else {
            this.logger.debug(
              `Both extraction methods failed for hash [${hash}], using original hash as fallback`,
            );
          }
        }
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (e: any) {
      const baseError = `Failed to get actual txId for tx [${hash}] which was found in the database: `;
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

    return actualTxId;
  };
}

export default FiroRpcNetwork;
