import { Psbt } from 'bitcoinjs-lib';
import { randomBytes } from 'crypto';

import { AbstractLogger } from '@rosen-bridge/abstract-logger';
import JsonBigInt from '@rosen-bridge/json-bigint';
import RateLimitedAxios from '@rosen-bridge/rate-limited-axios';
import {
  AssetBalance,
  BlockInfo,
  FailedError,
  ImpossibleBehavior,
  NetworkError,
  TokenDetail,
  UnexpectedApiError,
} from '@rosen-chains/abstract-chain';
import {
  AbstractBitcoinRunesNetwork,
  BitcoinRunesAssets,
  BitcoinRunesTx,
  BitcoinRunesUtxo,
  CONFIRMATION_TARGET,
} from '@rosen-chains/bitcoin-runes';

import {
  JsonRpcResult,
  BitcoinRpcChainInfo,
  BitcoinRpcTransaction,
  BitcoinRpcBlockSummary,
  BitcoinRpcUtxo,
  BitcoinRpcFeeRate,
  BitcoinRpcMempoolEntry,
  UnisatResponse,
  UnisatAddressBalance,
  UnisatAddressRunesBalance,
  UnisatRunesDetail,
  UnisatTxRunes,
  UnisatAddressRunesUtxos,
  UnisatAddressBtcUtxos,
  UnisatRunesInfo,
  RpcConfig,
  UnisatConfig,
} from './types';

export class BitcoinRunesRpcNetwork extends AbstractBitcoinRunesNetwork {
  protected rpcClient: RateLimitedAxios;
  protected unisatClient: RateLimitedAxios;

  constructor(
    rpcConfig: RpcConfig,
    unisatConfig: UnisatConfig,
    logger?: AbstractLogger,
  ) {
    super(logger);

    // init Bitcoin RPC client
    const rpcHeaders = { 'Content-Type': 'application/json' };
    // Add API key to headers if provided
    if (rpcConfig.rpcApiKey) {
      Object.assign(rpcHeaders, { 'x-api-key': rpcConfig.rpcApiKey });
    }
    const rpcAuthConfig =
      rpcConfig.rpcUsername || rpcConfig.rpcPassword
        ? {
            auth: {
              username: rpcConfig.rpcUsername || '',
              password: rpcConfig.rpcPassword || '',
            },
          }
        : {};
    this.rpcClient = RateLimitedAxios.create({
      baseURL: rpcConfig.url,
      headers: rpcHeaders,
      ...rpcAuthConfig,
    });

    // init Unisat client
    const unisatHeaders = { 'Content-Type': 'application/json' };
    // Add API key to headers if provided
    if (unisatConfig.unisatApiKey) {
      Object.assign(unisatHeaders, {
        Authorization: `Bearer ${unisatConfig.unisatApiKey}`,
      });
    }
    this.unisatClient = RateLimitedAxios.create({
      baseURL: unisatConfig.url,
      headers: unisatHeaders,
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
      const response = await this.rpcClient.post<
        JsonRpcResult<BitcoinRpcChainInfo>
      >('', {
        method: 'getblockchaininfo',
        id: randomId,
        params: [],
      });
      this.validateResponseId(randomId, response.data.id);
      this.logger.debug(
        `requested 'getblockchaininfo'. Response: ${JsonBigInt.stringify(
          response.data,
        )}`,
      );

      const chainInfo = response.data.result;
      return chainInfo.blocks;
    } catch (e: any) {
      const baseError = `Failed to fetch current height from Bitcoin RPC: `;
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
   * gets confirmation for a transaction (returns -1 if tx is not mined or found)
   * @param transactionId the transaction id
   * @returns the transaction confirmation
   */
  getTxConfirmation = async (transactionId: string): Promise<number> => {
    const randomId = this.generateRandomId();
    try {
      const response = await this.rpcClient.post<
        JsonRpcResult<BitcoinRpcTransaction>
      >('', {
        method: 'getrawtransaction',
        id: randomId,
        params: [transactionId, true],
      });
      this.validateResponseId(randomId, response.data.id);
      this.logger.debug(
        `requested 'getrawtransaction' for txId [${transactionId}]. Response: ${JsonBigInt.stringify(
          response.data,
        )}`,
      );

      const tx = response.data.result;
      if (tx.confirmations !== undefined) return tx.confirmations;
      return -1;
    } catch (e: any) {
      const baseError = `Failed to get confirmation for tx [${transactionId}] from Bitcoin RPC: `;
      if (e.response) {
        this.logger.debug(`tx [${transactionId}] is not found`);
        return -1;
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
    const balance: AssetBalance = {
      nativeToken: 0n,
      tokens: [],
    };
    try {
      const response = await this.unisatClient.get<
        UnisatResponse<UnisatAddressBalance>
      >(`/v1/indexer/address/${address}/balance`);
      this.logger.debug(
        `requested 'address/:address/balance' for address [${address}]. Response: ${JsonBigInt.stringify(
          response.data,
        )}`,
      );

      balance.nativeToken = BigInt(response.data.data.satoshi);
    } catch (e: any) {
      const baseError = `Failed to get address [${address}] BTC balance from Unisat: `;
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
    try {
      const response = await this.unisatClient.get<
        UnisatResponse<UnisatAddressRunesBalance>
      >(`/v1/indexer/address/${address}/runes/balance-list`);
      this.logger.debug(
        `requested 'address/:address/runes/balance-list' for address [${address}]. Response: ${JsonBigInt.stringify(
          response.data,
        )}`,
      );

      const runes = response.data.data.detail;
      runes.forEach((rune) => {
        balance.tokens.push({
          id: rune.runeid,
          value: BigInt(rune.amount),
        });
      });
    } catch (e: any) {
      const baseError = `Failed to get address [${address}] runes from Unisat: `;
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
    return balance;
  };

  /**
   * gets id of all transactions in the given block
   * @param blockId the block id
   * @returns list of the transaction ids in the block
   */
  getBlockTransactionIds = async (blockId: string): Promise<Array<string>> => {
    const randomId = this.generateRandomId();
    try {
      const response = await this.rpcClient.post<
        JsonRpcResult<BitcoinRpcBlockSummary>
      >('', {
        method: 'getblock',
        id: randomId,
        params: [blockId, 1],
      });
      this.validateResponseId(randomId, response.data.id);
      this.logger.debug(
        `requested 'getblock' for blockId [${blockId}]. Response: ${JsonBigInt.stringify(
          response.data,
        )}`,
      );

      const blockData: BitcoinRpcBlockSummary = response.data.result;
      return blockData.tx;
    } catch (e: any) {
      const baseError = `Failed to get block [${blockId}] transaction ids from Bitcoin RPC: `;
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
      const response = await this.rpcClient.post<
        JsonRpcResult<BitcoinRpcBlockSummary>
      >('', {
        method: 'getblock',
        id: randomId,
        params: [blockId, 1],
      });
      this.validateResponseId(randomId, response.data.id);
      this.logger.debug(
        `requested 'getblock' for blockId [${blockId}]. Response: ${JsonBigInt.stringify(
          response.data,
        )}`,
      );

      const blockData: BitcoinRpcBlockSummary = response.data.result;
      return {
        hash: blockData.hash,
        parentHash: blockData.previousblockhash,
        height: blockData.height,
      };
    } catch (e: any) {
      const baseError = `Failed to get block [${blockId}] info from Bitcoin RPC: `;
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
   * gets a transaction (serialized in `BitcoinTx` format)
   * @param transactionId the transaction id
   * @param blockId the block id
   * @returns the transaction
   */
  getTransaction = async (
    transactionId: string,
    blockId: string,
  ): Promise<BitcoinRunesTx> => {
    const randomId = this.generateRandomId();
    // get the raw transaction from RPC
    let tx: BitcoinRpcTransaction;
    try {
      const response = await this.rpcClient.post<
        JsonRpcResult<BitcoinRpcTransaction>
      >('', {
        method: 'getrawtransaction',
        id: randomId,
        params: [transactionId, true],
      });
      this.validateResponseId(randomId, response.data.id);
      this.logger.debug(
        `Requested 'getrawtransaction' for txId [${transactionId}]. Response: ${JsonBigInt.stringify(
          response.data,
        )}`,
      );

      tx = response.data.result;
    } catch (e: any) {
      const baseError = `Failed to get transaction [${transactionId}] from Bitcoin RPC: `;
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
    if (tx.blockhash !== blockId)
      throw new FailedError(
        `Tx [${transactionId}] doesn't belong to block [${blockId}]`,
      );

    // Transform the RPC transaction to the expected BitcoinRunesTx format
    const bitcoinTx: BitcoinRunesTx = {
      id: tx.txid,
      inputs: tx.vin.map((input) => ({
        txId: input.txid,
        index: input.vout,
        scriptPubKey: input.scriptSig.hex,
      })),
      outputs: tx.vout.map((output) => ({
        value: this.convertToSatoshis(output.value),
        scriptPubKey: output.scriptPubKey.hex,
        runes: [],
      })),
    };

    // get transaction height
    const blockInfo = await this.getBlockInfo(blockId);

    // get the runes transfers of the transaction from Unisat
    let txRunes: UnisatTxRunes;
    try {
      const response = await this.unisatClient.get<
        UnisatResponse<UnisatTxRunes>
      >(`/v1/indexer/runes/event?txid=${transactionId}`);
      this.logger.debug(
        `requested 'indexer/runes/event' filtering txId [${transactionId}]. Response: ${JsonBigInt.stringify(
          response.data,
        )}`,
      );

      txRunes = response.data.data;
      this.validateResponseHeight(blockInfo.height, txRunes.height);
      if (txRunes.detail.length !== txRunes.total) {
        throw Error(
          `Unexpected pagination: expected [${txRunes.total}] runes but got [${txRunes.detail.length}]`,
        );
      }
    } catch (e: any) {
      const baseError = `Failed to get runes event for tx [${transactionId}] from Unisat: `;
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

    for (const transfer of txRunes.detail) {
      if (transfer.txid !== transactionId) {
        throw new ImpossibleBehavior(
          `Fetched runes event for tx [${transactionId}] but got a transfer with txId [${transfer.txid}]`,
        );
      }
      if (transfer.type === 'send') continue;

      bitcoinTx.outputs[transfer.vout].runes.push({
        runeId: transfer.runeId,
        quantity: BigInt(transfer.amount),
      });
    }

    return bitcoinTx;
  };

  /**
   * submits a transaction
   * @param transaction the transaction
   */
  submitTransaction = async (transaction: Psbt): Promise<void> => {
    // Extract the raw transaction hex
    const txHex = transaction.extractTransaction().toHex();

    const randomId = this.generateRandomId();
    try {
      const response = await this.rpcClient.post<JsonRpcResult<string>>('', {
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
    } catch (e: any) {
      const baseError = `Failed to submit transaction to Bitcoin RPC: `;
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
   * gets token details (name, decimals)
   * @param tokenId
   */
  getTokenDetail = async (tokenId: string): Promise<TokenDetail> => {
    let info: UnisatRunesInfo | null;
    try {
      const response = await this.unisatClient.get<
        UnisatResponse<UnisatRunesInfo | null>
      >(`/v1/indexer/runes/${tokenId}/info`);
      this.logger.debug(
        `requested '/info' for rune [${tokenId}]. Response: ${JsonBigInt.stringify(
          response.data,
        )}`,
      );

      info = response.data.data;
    } catch (e: any) {
      const baseError = `Failed to get runes [${tokenId}] info from Unisat: `;
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
    if (info === null) throw new FailedError(`Rune [${tokenId}] not found`);
    return {
      tokenId: tokenId,
      name: info.spacedRune,
      decimals: info.divisibility,
    };
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
      const listUnspentResponse = await this.rpcClient.post<
        JsonRpcResult<BitcoinRpcUtxo | null>
      >('', {
        method: 'gettxout',
        id: randomId,
        params: [txId, outputIndex, false], // txid, n, include_mempool
      });
      this.validateResponseId(randomId, listUnspentResponse.data.id);
      this.logger.debug(
        `Requested 'gettxout' for txId [${txId}] and index [${outputIndex}]. Response: ${JsonBigInt.stringify(
          listUnspentResponse.data,
        )}`,
      );

      // If the result is null, the output is spent
      return listUnspentResponse.data.result !== null;
    } catch (e: any) {
      const baseError = `Failed to check if box [${boxId}] is unspent using Bitcoin RPC: `;
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
   * gets an utxo
   * @param boxId the box id
   * @returns the utxo
   */
  getUtxo = async (boxId: string): Promise<BitcoinRunesUtxo> => {
    const [txId, outputIndexStr] = boxId.split('.');
    const outputIndex = parseInt(outputIndexStr);

    // get UTxO BTC amount
    const randomId = this.generateRandomId();
    let tx: BitcoinRpcTransaction;
    try {
      const response = await this.rpcClient.post<
        JsonRpcResult<BitcoinRpcTransaction>
      >('', {
        method: 'getrawtransaction',
        id: randomId,
        params: [txId, true],
      });
      this.validateResponseId(randomId, response.data.id);
      this.logger.debug(
        `Requested 'getrawtransaction' for txId [${txId}]. Response: ${JsonBigInt.stringify(
          response.data,
        )}`,
      );
      tx = response.data.result;
    } catch (e: any) {
      const baseError = `Failed to get transaction [${txId}] from Bitcoin RPC: `;
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
    if (tx.vout.length <= outputIndex)
      throw new FailedError(
        `UTxO [${boxId}] is invalid: index is out of bound [${tx.vout.length} <= ${outputIndex}]`,
      );
    const btcAmount = this.convertToSatoshis(tx.vout[outputIndex].value);

    // get UTxO Runes amount
    const utxoRunes = await this.getUtxoRunesBalance(boxId);

    return {
      txId,
      index: outputIndex,
      value: btcAmount,
      runes: utxoRunes,
    };
  };

  /**
   * gets the fee ratio
   * @returns the fee ratio in satoshis/byte
   */
  getFeeRatio = async (): Promise<number> => {
    const randomId = this.generateRandomId();
    try {
      const response = await this.rpcClient.post<
        JsonRpcResult<BitcoinRpcFeeRate>
      >('', {
        method: 'estimatesmartfee',
        id: randomId,
        params: [CONFIRMATION_TARGET], // Number of blocks to target for confirmation
      });
      this.validateResponseId(randomId, response.data.id);
      this.logger.debug(
        `requested 'estimatesmartfee'. Response: ${JsonBigInt.stringify(
          response.data,
        )}`,
      );

      const feeSatoshis = this.convertToSatoshis(response.data.result.feerate);
      const feeRate = Number(feeSatoshis) / 1024;
      return Math.ceil(feeRate);
    } catch (e: any) {
      const baseError = `Failed to get fee ratio from Bitcoin RPC: `;
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
      const response = await this.rpcClient.post<
        JsonRpcResult<BitcoinRpcMempoolEntry>
      >('', {
        method: 'getmempoolentry',
        id: randomId,
        params: [txId],
      });
      this.validateResponseId(randomId, response.data.id);
      this.logger.debug(
        `requested 'getmempoolentry' with txId [${txId}]. Response: ${JsonBigInt.stringify(
          response.data,
        )}`,
      );

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

      const baseError = `Failed to check if tx [${txId}] is in mempool from Bitcoin RPC: `;
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
   * gets only runes balance of an utxo
   * @param boxId the box id
   * @returns the runes of the utxo
   */
  protected getUtxoRunesBalance = async (
    boxId: string,
  ): Promise<BitcoinRunesAssets[]> => {
    const [txId, outputIndexStr] = boxId.split('.');
    const outputIndex = parseInt(outputIndexStr);

    const utxoRunes: Array<BitcoinRunesAssets> = [];
    try {
      const response = await this.unisatClient.get<
        UnisatResponse<UnisatRunesDetail[]>
      >(`/v1/indexer/runes/utxo/${txId}/${outputIndex}/balance`);
      this.logger.debug(
        `requested 'runes/utxo/:txid/:vout/balance' for box [${boxId}]. Response: ${JsonBigInt.stringify(
          response.data,
        )}`,
      );

      // TODO: validate Unisat indexed height (local:ergo/rosen-bridge/rosen-chains#179)
      const runes = response.data.data;
      runes.forEach((rune) => {
        utxoRunes.push({
          runeId: rune.runeid,
          quantity: BigInt(rune.amount),
        });
      });
    } catch (e: any) {
      const baseError = `Failed to get runes for box [${boxId}] from Unisat: `;
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
    return utxoRunes;
  };

  /**
   * gets confirmed and unspent boxes of an address that contains given rune
   * @param address the address
   * @param runeId the rune ID
   * @param offset
   * @param limit
   * @returns list of boxes
   */
  getAddressRunesBoxes = async (
    address: string,
    runeId: string,
    offset: number,
    limit: number,
  ): Promise<Array<BitcoinRunesUtxo>> => {
    try {
      const response = await this.unisatClient.get<
        UnisatResponse<UnisatAddressRunesUtxos | undefined>
      >(
        `/v1/indexer/address/${address}/runes/${runeId}/utxo?start=${offset}&limit=${limit}`,
      );
      this.logger.debug(
        `requested 'utxo?start=${offset}&limit=${limit}' for address [${address}] and rune [${runeId}]. Response: ${JsonBigInt.stringify(
          response.data,
        )}`,
      );

      if (!response.data.data) return [];
      const utxos = response.data.data.utxo;
      return utxos.map((utxo) => ({
        txId: utxo.txid,
        index: utxo.vout,
        value: BigInt(utxo.satoshi),
        runes: utxo.runes.map((rune) => ({
          runeId: rune.runeid,
          quantity: BigInt(rune.amount),
        })),
      }));
    } catch (e: any) {
      const baseError = `Failed to get UTxOs containing rune [${runeId}] for address [${address}] with offset/limit [${offset}/${limit}] from Unisat: `;
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
   * gets confirmed and unspent boxes of an address that contains no rune
   * @param address the address
   * @returns list of boxes
   */
  getAddressBtcBoxes = async (
    address: string,
  ): Promise<Array<BitcoinRunesUtxo>> => {
    try {
      const response = await this.unisatClient.get<
        UnisatResponse<UnisatAddressBtcUtxos | undefined>
      >(`/v1/indexer/address/${address}/available-utxo-data`);
      this.logger.debug(
        `requested 'available-utxo-data' for address [${address}]. Response: ${JsonBigInt.stringify(
          response.data,
        )}`,
      );

      if (!response.data.data) return [];
      const utxos = response.data.data.utxo;
      return utxos.map((utxo) => ({
        txId: utxo.txid,
        index: utxo.vout,
        value: BigInt(utxo.satoshi),
        runes: [],
      }));
    } catch (e: any) {
      const baseError = `Failed to get UTxOs containing BTC only for address [${address}] from Unisat: `;
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
   * gets confirmed and unspent boxes of an address that are not fetched yet
   *
   * Note: this function ignores the `fetchedBoxIds`, meaning it does not
   * return it nor fetch its Runes balance
   * @param fetchedBoxIds the list of fetched box IDs
   * @param address the address
   * @returns list of boxes
   */
  getRemainingBoxes = async (
    fetchedBoxIds: Array<string>,
    address: string,
  ): Promise<Array<BitcoinRunesUtxo>> => {
    const utxos: Array<BitcoinRunesUtxo> = [];
    try {
      const response = await this.unisatClient.get<
        UnisatResponse<UnisatAddressBtcUtxos | undefined>
      >(`/v1/indexer/address/${address}/all-utxo-data`);
      this.logger.debug(
        `requested 'all-utxo-data' for address [${address}]. Response: ${JsonBigInt.stringify(
          response.data,
        )}`,
      );

      if (!response.data.data) return [];
      const allUtxos = response.data.data.utxo;
      utxos.push(
        ...allUtxos
          .filter(
            (utxo) => !fetchedBoxIds.includes(`${utxo.txid}.${utxo.vout}`),
          )
          .map((utxo) => ({
            txId: utxo.txid,
            index: utxo.vout,
            value: BigInt(utxo.satoshi),
            runes: [],
          })),
      );
    } catch (e: any) {
      const baseError = `Failed to get UTxOs containing BTC only for address [${address}] from Unisat: `;
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

    for (const utxo of utxos) {
      utxo.runes = await this.getUtxoRunesBalance(`${utxo.txId}.${utxo.index}`);
    }

    return utxos;
  };

  /**
   * throws error if response height (Unisat height) is less than the expected height
   * @param expectedHeight
   * @param responseHeight
   */
  protected validateResponseHeight = (
    expectedHeight: number,
    responseHeight: number,
  ): void => {
    if (expectedHeight > responseHeight)
      throw Error(
        `Unisat is not synced enough [${responseHeight} < ${expectedHeight}]`,
      );
  };
}
