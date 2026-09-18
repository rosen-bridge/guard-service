import { randomBytes } from 'crypto';
import type { MTX } from 'hsd';

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
  AbstractHandshakeNetwork,
  HandshakeTx,
  HandshakeUtxo,
  CONFIRMATION_TARGET,
} from '@rosen-chains/handshake';
import RateLimitedAxios, {
  Axios as RateLimitedAxiosClass,
} from '@rosen-clients/rate-limited-axios';

import {
  COIN_COVENANT_TYPE,
  FALLBACK_FEE_RATE,
  MEMPOOL_COIN_HEIGHT,
  MINIMUM_FEE_RATIO,
  RPC_MISC_ERROR,
} from './constants';
import { HandshakeRpcError } from './errors';
import {
  HandshakeRpcTransaction,
  HandshakeRpcTxOutput,
  JsonRpcResult,
  HandshakeBlockSummary,
  HandshakeChainInfo,
  RpcAuth,
  HandshakeCoin,
} from './types';

export class HandshakeRpcNetwork extends AbstractHandshakeNetwork {
  protected client: RateLimitedAxiosClass; // Node RPC client (port 12037)

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
   * calls a JSON-RPC method on the node
   *
   * hsd answers a failed call with HTTP 200 and an `error` object in the body,
   * so the failure has to be read from the response rather than from a rejected
   * request
   * @param method the rpc method name
   * @param params the rpc method params
   * @param baseError prefix of the message of any thrown error
   * @returns the result of the call
   * @throws HandshakeRpcError if the node reports the call as failed
   */
  protected callRpc = async <Result>(
    method: string,
    params: Array<unknown>,
    baseError: string,
  ): Promise<Result> => {
    const requestId = this.generateRandomId();

    let response;
    try {
      response = await this.client.post<JsonRpcResult<Result>>('', {
        method: method,
        id: requestId,
        params: params,
      });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (e: any) {
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

    this.validateResponseId(requestId, response.data.id);

    const error = response.data.error;
    if (error) {
      throw new HandshakeRpcError(
        error.code,
        baseError + JsonBigInt.stringify(error),
      );
    }

    this.logger?.debug(
      `Requested '${method}' with params ${JsonBigInt.stringify(
        params,
      )}. Response: ${JsonBigInt.stringify(response.data.result)}`,
    );

    return response.data.result;
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
    const chainInfo = await this.callRpc<HandshakeChainInfo>(
      'getblockchaininfo',
      [],
      `Failed to fetch current height from Handshake RPC: `,
    );

    return chainInfo.blocks;
  };

  /**
   * gets id of all transactions in the given block
   * @param blockId the block id
   * @returns list of the transaction ids in the block
   */
  getBlockTransactionIds = async (blockId: string): Promise<Array<string>> => {
    const blockData = await this.callRpc<HandshakeBlockSummary>(
      'getblock',
      [blockId, true, false],
      `Failed to get block [${blockId}] transaction ids from Handshake RPC: `,
    );

    return blockData.tx;
  };

  /**
   * gets info of the given block
   * @param blockId the block id
   * @returns the block info
   */
  getBlockInfo = async (blockId: string): Promise<BlockInfo> => {
    const blockData = await this.callRpc<HandshakeBlockSummary>(
      'getblock',
      [blockId],
      `Failed to get block [${blockId}] info from Handshake RPC: `,
    );

    return {
      hash: blockData.hash,
      parentHash: blockData.previousblockhash,
      height: blockData.height,
    };
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
    const tx = await this.callRpc<HandshakeRpcTransaction>(
      'getrawtransaction',
      [transactionId, true],
      `Failed to get transaction [${transactionId}] from Handshake RPC: `,
    );

    // Validate block hash matches
    if (tx.blockhash !== blockId) {
      throw new FailedError(
        `Transaction [${transactionId}] is in block [${tx.blockhash}], not in requested block [${blockId}]`,
      );
    }

    // Transform the RPC transaction to the expected HandshakeTx format
    return {
      id: tx.txid,
      inputs: tx.vin.map((input) => ({
        txId: input.txid,
        index: input.vout,
      })),
      outputs: tx.vout.map((output) => ({
        // RPC reports output values in HNS
        value: this.convertDollarydoos(output.value),
        address: output.address || {
          version: 0,
          hash: '',
          string: '',
        },
        covenant: output.covenant || {
          type: COIN_COVENANT_TYPE,
          action: 'NONE',
          items: [],
        },
      })),
    };
  };

  /**
   * submits a transaction
   * @param transaction the transaction
   */
  submitTransaction = async (transaction: MTX): Promise<void> => {
    // Extract the raw transaction hex
    const txHex = transaction.toRaw().toString('hex');

    await this.callRpc<string>(
      'sendrawtransaction',
      [txHex],
      `Failed to submit transaction to Handshake RPC: `,
    );
  };

  /**
   * checks if a box is unspent and valid
   * @param boxId the box id
   * @returns true if the box is unspent and valid
   */
  isBoxUnspentAndValid = async (boxId: string): Promise<boolean> => {
    const [txId, outputIndexStr] = boxId.split('.');
    const outputIndex = parseInt(outputIndexStr);

    const utxo = await this.callRpc<HandshakeRpcTxOutput | null>(
      'gettxout',
      [txId, outputIndex, false], // txid, n, include_mempool
      `Failed to check if box [${boxId}] is unspent from Handshake RPC: `,
    );

    // hsd returns null when the output is spent or its transaction is unknown
    return utxo !== null;
  };

  /**
   * gets a utxo
   * @param boxId the box id
   * @returns the utxo
   */
  getUtxo = async (boxId: string): Promise<HandshakeUtxo> => {
    const [txId, outputIndexStr] = boxId.split('.');
    const outputIndex = parseInt(outputIndexStr);

    // Get the transaction to extract the UTXO information
    const tx = await this.callRpc<HandshakeRpcTransaction>(
      'getrawtransaction',
      [txId, true],
      `Failed to get UTXO [${boxId}] from Handshake RPC: `,
    );

    if (!tx || outputIndex >= tx.vout.length) {
      throw new FailedError(`UTXO with boxId [${boxId}] not found`);
    }

    const output = tx.vout[outputIndex];

    if (output.covenant.type !== COIN_COVENANT_TYPE) {
      throw new FailedError(
        `UTXO with boxId [${boxId}] is not a coin output (covenant type: ${output.covenant.type})`,
      );
    }

    return {
      txId: txId,
      index: outputIndex,
      // RPC reports output values in HNS
      value: this.convertDollarydoos(output.value),
    };
  };

  /**
   * gets the fee ratio
   * @returns the fee ratio in dollarydoos/vB
   */
  getFeeRatio = async (): Promise<number> => {
    const feeRate = await this.callRpc<number>(
      'estimatefee',
      [CONFIRMATION_TARGET], // Number of blocks to target for confirmation
      `Failed to get fee ratio from Handshake RPC: `,
    );

    // estimatefee returns -1 if it can't estimate (insufficient historical data)
    const estimatedFeeRate =
      feeRate === -1 || feeRate <= 0 ? FALLBACK_FEE_RATE : feeRate;

    // Convert from HNS/kB (1000 bytes) to dollarydoos/vB.
    const feeDollarydoos = this.convertDollarydoos(estimatedFeeRate);
    const feePerVByte = Number(feeDollarydoos) / 1000;

    // A node may estimate below the relay minimum (e.g. 0.000999 HNS/kB), which
    // would build transactions the network rejects as underpaying
    return Math.max(feePerVByte, MINIMUM_FEE_RATIO);
  };

  /**
   * gets the confirmed and unspent coin outputs of an address
   * @param address the address
   * @returns list of the address coins
   */
  protected getAddressCoins = async (
    address: string,
  ): Promise<Array<HandshakeCoin>> => {
    try {
      const coins = (
        await this.client.get<Array<HandshakeCoin>>(`/coin/address/${address}`)
      ).data;

      this.logger?.debug(
        `Requested '/coin/address' for address [${address}]. Response: ${JsonBigInt.stringify(
          coins,
        )}`,
      );

      // hsd merges mempool coins into this endpoint, so unconfirmed ones have to
      // be dropped; only regular coin outputs hold spendable HNS
      return coins.filter(
        (coin) =>
          coin.covenant.type === COIN_COVENANT_TYPE &&
          coin.height !== MEMPOOL_COIN_HEIGHT,
      );
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (e: any) {
      const baseError = `Failed to get address [${address}] coins from Handshake: `;
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
    const coins = await this.getAddressCoins(address);

    // the `/coin/address` endpoint already reports values in dollarydoos
    const totalBalance = coins.reduce(
      (sum, coin) => sum + BigInt(coin.value),
      0n,
    );

    return {
      nativeToken: totalBalance,
      tokens: [],
    };
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
    const coins = await this.getAddressCoins(address);

    // the `/coin/address` endpoint already reports values in dollarydoos
    const boxes: HandshakeUtxo[] = coins.map((coin) => ({
      txId: coin.hash,
      index: coin.index,
      value: BigInt(coin.value),
    }));

    return boxes.slice(offset, offset + limit);
  };

  /**
   * gets id of transactions in mempool
   * @returns list of transaction ids in mempool
   */
  getMempoolTxIds = async (): Promise<Array<string>> => {
    const txIds = await this.callRpc<Array<string>>(
      'getrawmempool',
      [false], // verbose = false, just return tx ids
      `Failed to get mempool tx ids from Handshake RPC: `,
    );

    return txIds;
  };

  /**
   * gets the confirmation of a transaction
   * @param transactionId the transaction id
   * @returns the number of confirmations, or -1 if the transaction is unknown
   * or still unconfirmed
   */
  getTxConfirmation = async (transactionId: string): Promise<number> => {
    let tx: HandshakeRpcTransaction;
    try {
      tx = await this.callRpc<HandshakeRpcTransaction>(
        'getrawtransaction',
        [transactionId, true],
        `Failed to get tx confirmation for [${transactionId}] from Handshake RPC: `,
      );
    } catch (e) {
      // hsd reports an unknown transaction as a misc error, which is also what
      // a node without a transaction index reports for every transaction
      if (e instanceof HandshakeRpcError && e.code === RPC_MISC_ERROR) {
        this.logger?.debug(
          `Transaction [${transactionId}] is unknown to the node: ${e.message}`,
        );
        return -1;
      }
      throw e;
    }

    // hsd reports no block hash and zero confirmations while the tx is in the mempool
    if (!tx.blockhash) return -1;

    return tx.confirmations ?? -1;
  };
}
