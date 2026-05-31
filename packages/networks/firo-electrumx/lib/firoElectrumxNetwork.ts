import { Psbt } from 'bitcoinjs-lib';
import * as crypto from 'crypto';
import * as tls from 'tls';

import { AbstractLogger } from '@rosen-bridge/abstract-logger';
import {
  BlockInfo,
  FailedError,
  NetworkError,
  PaymentTransaction,
  UnexpectedApiError,
} from '@rosen-chains/abstract-chain';
import {
  AbstractFiroNetwork,
  FiroTx,
  FiroUtxo,
  FIRO_NETWORK,
} from '@rosen-chains/firo';

const BASE58_ALPHABET =
  '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
const BASE58_REGEX =
  /^[123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz]+$/;

// Current Firo prefixes plus legacy D-address P2PKH used by Rosen configs.
const FIRO_P2PKH_PREFIXES = new Set([
  0x1e,
  0x41,
  0x42,
  FIRO_NETWORK.pubKeyHash,
]);
const FIRO_P2SH_PREFIXES = new Set([FIRO_NETWORK.scriptHash, 0xb2, 0xb3]);

function base58Decode(encoded: string): Buffer {
  const bytes: number[] = [];
  for (let i = 0; i < encoded.length; i++) {
    const c = encoded[i];
    if (c === undefined) continue;
    let carry = BASE58_ALPHABET.indexOf(c);
    if (carry < 0) throw new Error(`Invalid base58 character: ${c}`);
    for (let j = 0; j < bytes.length; j++) {
      const b = bytes[j];
      if (b === undefined) continue;
      carry += b * 58;
      bytes[j] = carry & 0xff;
      carry >>= 8;
    }
    while (carry > 0) {
      bytes.push(carry & 0xff);
      carry >>= 8;
    }
  }
  // Add leading zero bytes for each leading '1' in encoded
  for (const ch of encoded) {
    if (ch === '1') bytes.push(0);
    else break;
  }
  return Buffer.from(bytes.reverse());
}

export function addressToScripthash(address: string): string {
  const decoded = base58Decode(address);
  if (decoded.length !== 25) {
    throw new Error(`Invalid Firo address length: ${decoded.length}`);
  }

  const payload = decoded.subarray(0, 21);
  const checksum = decoded.subarray(21);
  const expectedChecksum = doubleSha256(payload).subarray(0, 4);
  if (!checksum.equals(expectedChecksum)) {
    throw new Error('Invalid Firo address checksum');
  }

  const version = payload[0];
  if (version === undefined) {
    throw new Error('Invalid Firo address version');
  }

  const payloadHash = payload.subarray(1);
  let script: Buffer;
  if (FIRO_P2PKH_PREFIXES.has(version)) {
    // P2PKH script: OP_DUP OP_HASH160 <20 bytes> OP_EQUALVERIFY OP_CHECKSIG
    script = Buffer.concat([
      Buffer.from([0x76, 0xa9, 0x14]),
      payloadHash,
      Buffer.from([0x88, 0xac]),
    ]);
  } else if (FIRO_P2SH_PREFIXES.has(version)) {
    // P2SH script: OP_HASH160 <20 bytes> OP_EQUAL
    script = Buffer.concat([
      Buffer.from([0xa9, 0x14]),
      payloadHash,
      Buffer.from([0x87]),
    ]);
  } else {
    throw new Error(`Unsupported Firo address version: ${version}`);
  }

  const scriptHash = crypto.createHash('sha256').update(script).digest();
  return scriptHash.reverse().toString('hex');
}

function reverseHex(hex: string): string {
  const buf = Buffer.from(hex, 'hex');
  return buf.reverse().toString('hex');
}

function doubleSha256(data: Buffer): Buffer {
  return crypto
    .createHash('sha256')
    .update(crypto.createHash('sha256').update(data).digest())
    .digest();
}

function readVarInt(data: Buffer, offset: number): [number, number] {
  const first = data[offset];
  if (first === undefined) throw new Error('Unexpected end of data');
  if (first < 0xfd) return [first, offset + 1];
  if (first === 0xfd) return [data.readUInt16LE(offset + 1), offset + 3];
  if (first === 0xfe) return [data.readUInt32LE(offset + 1), offset + 5];
  return [Number(data.readBigInt64LE(offset + 1)), offset + 9];
}

type FiroVerboseTransaction = {
  confirmations?: number;
};

class FiroElectrumXNetwork extends AbstractFiroNetwork {
  private readonly host: string;
  private readonly port: number;
  private readonly timeout: number;
  private readonly getSavedTransactionById: (
    txId: string,
  ) => Promise<PaymentTransaction | undefined>;

  private socket: tls.TLSSocket | null = null;
  private responseBuffer = '';
  private pendingRequests: Map<
    number,
    { resolve: (value: unknown) => void; reject: (error: Error) => void }
  > = new Map();
  private nextId = 1;
  private connectPromise: Promise<void> | null = null;
  private serverVersionSent = false;

  // Block hash to height cache for resolving block methods.
  private hashToHeight = new Map<string, number>();
  private lastKnownHeight = 0;

  constructor(
    host: string,
    port: number,
    getSavedTransactionById: (
      txId: string,
    ) => Promise<PaymentTransaction | undefined>,
    logger?: AbstractLogger,
    timeout = 30000,
  ) {
    super(logger);
    this.host = host;
    this.port = port;
    this.timeout = timeout;
    this.getSavedTransactionById = getSavedTransactionById;
  }

  private doConnect = (): Promise<void> => {
    return new Promise((resolve, reject) => {
      const socket = tls.connect({
        host: this.host,
        port: this.port,
        servername: this.host,
      });
      socket.setEncoding('utf-8');
      socket.setNoDelay(true);
      socket.setTimeout(this.timeout);

      let buffer = '';
      const versionPromise = new Promise<void>((vResolve, vReject) => {
        const versionId = 0;
        const timer = setTimeout(() => {
          socket.destroy();
          vReject(new Error('ElectrumX server.version timeout'));
        }, this.timeout);

        const onData = (data: string) => {
          buffer += data;
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';
          for (const line of lines) {
            if (!line.trim()) continue;
            try {
              const response = JSON.parse(line);
              if (response.id === versionId) {
                clearTimeout(timer);
                socket.removeListener('data', onData);
                vResolve();
              }
            } catch {
              // ignore parse errors
            }
          }
        };
        socket.on('data', onData);

        socket.on('error', (err: Error) => {
          clearTimeout(timer);
          vReject(err);
        });
      });

      socket.once('secureConnect', () => {
        // Send server.version handshake
        socket.write(
          JSON.stringify({
            jsonrpc: '2.0',
            id: 0,
            method: 'server.version',
            params: ['guard-service', '1.4'],
          }) + '\n',
        );

        versionPromise
          .then(() => {
            this.serverVersionSent = true;
            this.socket = socket;
            this.setupSocketListeners(socket);
            resolve();
          })
          .catch((err) => {
            socket.destroy();
            reject(err);
          });
      });

      socket.once('error', (err: Error) => {
        reject(err);
      });
    });
  };

  private setupSocketListeners = (socket: tls.TLSSocket) => {
    socket.on('data', (data: string) => {
      this.responseBuffer += data;
      const lines = this.responseBuffer.split('\n');
      this.responseBuffer = lines.pop() || '';
      for (const line of lines) {
        if (!line.trim()) continue;
        try {
          const response = JSON.parse(line);
          const pending = this.pendingRequests.get(response.id);
          if (pending) {
            this.pendingRequests.delete(response.id);
            if (response.error) {
              pending.reject(
                new Error(
                  `ElectrumX error: ${
                    response.error.message || JSON.stringify(response.error)
                  }`,
                ),
              );
            } else {
              pending.resolve(response.result);
            }
          }
        } catch {
          // ignore parse errors
        }
      }
    });

    socket.on('error', (err: Error) => {
      this.socket = null;
      this.serverVersionSent = false;
      this.rejectAllPending(
        new NetworkError(`TLS socket error: ${err.message}`),
      );
    });

    socket.on('close', () => {
      this.socket = null;
      this.serverVersionSent = false;
      this.rejectAllPending(new NetworkError('TLS connection closed'));
    });

    socket.on('timeout', () => {
      socket.destroy();
      this.socket = null;
      this.serverVersionSent = false;
      this.rejectAllPending(new NetworkError('TLS connection timeout'));
    });
  };

  private rejectAllPending = (error: Error) => {
    for (const pending of this.pendingRequests.values()) {
      pending.reject(error);
    }
    this.pendingRequests.clear();
  };

  private ensureConnected = async (): Promise<void> => {
    if (this.socket && this.serverVersionSent && !this.socket.destroyed) {
      return;
    }
    if (this.connectPromise) {
      await this.connectPromise;
      return;
    }
    this.connectPromise = this.doConnect();
    try {
      await this.connectPromise;
    } finally {
      this.connectPromise = null;
    }
  };

  private sendRequest = (
    method: string,
    params: unknown[],
  ): Promise<unknown> => {
    return new Promise((resolve, reject) => {
      const id = this.nextId++;
      this.pendingRequests.set(id, { resolve, reject });

      const timer = setTimeout(() => {
        this.pendingRequests.delete(id);
        reject(new Error(`ElectrumX request timeout [${method}]`));
      }, this.timeout);

      const origResolve = resolve;
      const origReject = reject;
      this.pendingRequests.set(id, {
        resolve: (value: unknown) => {
          clearTimeout(timer);
          origResolve(value);
        },
        reject: (error: Error) => {
          clearTimeout(timer);
          origReject(error);
        },
      });

      try {
        this.socket!.write(
          JSON.stringify({
            jsonrpc: '2.0',
            id,
            method,
            params,
          }) + '\n',
        );
      } catch (err) {
        clearTimeout(timer);
        this.pendingRequests.delete(id);
        reject(
          new NetworkError(
            `Failed to send ElectrumX request: ${
              err instanceof Error ? err.message : 'Unknown error'
            }`,
          ),
        );
      }
    });
  };

  // AbstractChainNetwork methods.

  getHeight = async (): Promise<number> => {
    try {
      await this.ensureConnected();
      const result = (await this.sendRequest(
        'blockchain.headers.subscribe',
        [],
      )) as {
        height: number;
      };
      this.lastKnownHeight = result.height;
      this.logger.debug(`Current height: ${result.height}`);
      return result.height;
    } catch (e) {
      throw this.wrapError(
        'Failed to fetch current height from Firo ElectrumX',
        e,
      );
    }
  };

  getBlockTransactionIds = async (blockId: string): Promise<Array<string>> => {
    try {
      const height = await this.resolveHeight(blockId);
      await this.ensureConnected();
      const result = (await this.sendRequest('blockchain.block.txids', [
        height,
      ])) as Array<string>;
      this.logger.debug(
        `Block [${blockId}] at height [${height}] has ` +
          `${result.length} transactions`,
      );
      return result;
    } catch (e) {
      throw this.wrapError(
        `Failed to get block [${blockId}] transaction ids from Firo ElectrumX`,
        e,
      );
    }
  };

  getBlockInfo = async (blockId: string): Promise<BlockInfo> => {
    try {
      const height = await this.resolveHeight(blockId);
      await this.ensureConnected();
      const headerHex = (await this.sendRequest('blockchain.block.header', [
        height,
      ])) as string;
      const headerBytes = Buffer.from(headerHex, 'hex');
      if (headerBytes.length < 80) {
        throw new Error(`Invalid block header length: ${headerBytes.length}`);
      }

      // Parse block header (80 bytes)
      const hash = reverseHex(doubleSha256(headerBytes).toString('hex'));
      const parentHash = reverseHex(
        headerBytes.subarray(4, 36).toString('hex'),
      );

      // Cache the mapping
      this.hashToHeight.set(hash, height);

      this.logger.debug(
        `Block [${blockId}] at height [${height}]: ` +
          `hash=${hash}, parent=${parentHash}`,
      );

      return { hash, parentHash, height };
    } catch (e) {
      throw this.wrapError(
        `Failed to get block [${blockId}] info from Firo ElectrumX`,
        e,
      );
    }
  };

  getTransaction = async (
    transactionId: string,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    blockId: string,
  ): Promise<FiroTx> => {
    try {
      await this.ensureConnected();
      const txHex = (await this.sendRequest('blockchain.transaction.get', [
        transactionId,
      ])) as string;
      const firoTx = this.parseTransactionHex(txHex, transactionId);
      this.logger.debug(`Fetched transaction [${transactionId}]`);
      return firoTx;
    } catch (e) {
      throw this.wrapError(
        `Failed to get transaction [${transactionId}] from Firo ElectrumX`,
        e,
      );
    }
  };

  submitTransaction = async (transaction: Psbt): Promise<void> => {
    const txHex = transaction.extractTransaction(true).toHex();
    try {
      await this.ensureConnected();
      const result = (await this.sendRequest(
        'blockchain.transaction.broadcast',
        [txHex],
      )) as string;
      this.logger.debug(`Submitted transaction. Result: ${result}`);
    } catch (e) {
      throw this.wrapError('Failed to submit transaction to Firo ElectrumX', e);
    }
  };

  getMempoolTransactions = async (): Promise<Array<FiroTx>> => {
    return [];
  };

  getTokenDetail = async (tokenId: string) => {
    throw new Error(
      `Firo network does not support token [${tokenId}]. ` +
        'Only native token is supported.',
    );
  };

  getTxConfirmation = async (transactionId: string): Promise<number> => {
    const realTxId = await this.getActualTxId(transactionId);
    return await this.getTxConfirmationSigned(realTxId);
  };

  getAddressAssets = async (
    address: string,
  ): Promise<{
    nativeToken: bigint;
    tokens: Array<{ id: string; value: bigint }>;
  }> => {
    try {
      // Validate address contains only base58 characters
      if (!BASE58_REGEX.test(address)) {
        return { nativeToken: 0n, tokens: [] };
      }
      const scripthash = addressToScripthash(address);
      await this.ensureConnected();
      const result = (await this.sendRequest(
        'blockchain.scripthash.get_balance',
        [scripthash],
      )) as { confirmed: number; unconfirmed: number };
      this.logger.debug(
        `Address [${address}] balance: confirmed=${result.confirmed}, ` +
          `unconfirmed=${result.unconfirmed}`,
      );
      return {
        nativeToken: BigInt(result.confirmed),
        tokens: [],
      };
    } catch (e) {
      throw this.wrapError(
        `Failed to get address assets for [${address}] from Firo ElectrumX`,
        e,
      );
    }
  };

  // AbstractUtxoChainNetwork methods.

  getAddressBoxes = async (
    address: string,
    offset: number,
    limit: number,
  ): Promise<Array<FiroUtxo>> => {
    try {
      // Validate address contains only base58 characters
      if (!BASE58_REGEX.test(address)) {
        return [];
      }
      const scripthash = addressToScripthash(address);
      await this.ensureConnected();
      const utxos = (await this.sendRequest(
        'blockchain.scripthash.listunspent',
        [scripthash],
      )) as Array<{
        tx_hash: string;
        tx_pos: number;
        height: number;
        value: number;
      }>;

      // Filter unconfirmed (height=0), then paginate
      const firoUtxos = utxos
        .filter((utxo) => utxo.height > 0)
        .slice(offset, offset + limit)
        .map((utxo) => ({
          txId: utxo.tx_hash,
          index: utxo.tx_pos,
          value: BigInt(utxo.value),
        }));

      this.logger.debug(
        `Address [${address}] has ${utxos.length} UTXOs, ` +
          `returning ${firoUtxos.length} after pagination`,
      );
      return firoUtxos;
    } catch (e) {
      throw this.wrapError(
        `Failed to get address boxes for [${address}] from Firo ElectrumX`,
        e,
      );
    }
  };

  isBoxUnspentAndValid = async (boxId: string): Promise<boolean> => {
    const [txId, outputIndexStr] = boxId.split('.');
    const outputIndex = parseInt(outputIndexStr, 10);

    try {
      await this.ensureConnected();
      // Get the transaction to verify the output exists
      const txHex = (await this.sendRequest('blockchain.transaction.get', [
        txId,
      ])) as string;
      const tx = this.parseTransactionHex(txHex, txId);

      if (!tx || outputIndex >= tx.outputs.length) {
        return false;
      }

      // Check if the output is unspent by computing its scripthash
      // and checking against listunspent
      const scriptPubKey = tx.outputs[outputIndex]!.scriptPubKey;
      const scripthash = reverseHex(
        crypto
          .createHash('sha256')
          .update(Buffer.from(scriptPubKey, 'hex'))
          .digest()
          .toString('hex'),
      );

      const unspent = (await this.sendRequest(
        'blockchain.scripthash.listunspent',
        [scripthash],
      )) as Array<{ tx_hash: string; tx_pos: number }>;

      return unspent.some(
        (utxo) => utxo.tx_hash === txId && utxo.tx_pos === outputIndex,
      );
    } catch (e: unknown) {
      // If transaction not found, box is not valid
      if (e instanceof Error && e.message.includes('No such transaction')) {
        return false;
      }
      throw this.wrapError(
        `Failed to check if box [${boxId}] is unspent from Firo ElectrumX`,
        e,
      );
    }
  };

  // AbstractFiroNetwork methods.

  getUtxo = async (boxId: string): Promise<FiroUtxo> => {
    const [txId, outputIndexStr] = boxId.split('.');
    const outputIndex = parseInt(outputIndexStr, 10);

    try {
      await this.ensureConnected();
      const txHex = (await this.sendRequest('blockchain.transaction.get', [
        txId,
      ])) as string;
      const tx = this.parseTransactionHex(txHex, txId);

      if (!tx || outputIndex >= tx.outputs.length) {
        throw new FailedError(`UTXO with boxId [${boxId}] not found`);
      }

      return {
        txId,
        index: outputIndex,
        value: tx.outputs[outputIndex]!.value,
      };
    } catch (e) {
      if (e instanceof FailedError) throw e;
      throw this.wrapError(
        `Failed to get UTXO [${boxId}] from Firo ElectrumX`,
        e,
      );
    }
  };

  getFeeRatio = async (): Promise<number> => {
    try {
      await this.ensureConnected();
      const feeRate = (await this.sendRequest('blockchain.estimatefee', [
        6,
      ])) as number;
      // ElectrumX returns fee in BTC/kB, convert to satoshis/byte
      if (feeRate <= 0) {
        // ElectrumX returns -1 when it cannot estimate (not enough data).
        // Use a conservative fallback for typical low-fee periods.
        this.logger.warn(
          `ElectrumX estimatefee returned ${feeRate}, ` +
            `using fallback 10 sat/byte`,
        );
        return 10;
      }
      const feeSatoshis = Math.ceil(feeRate * 100000000);
      const feePerByte = Math.ceil(feeSatoshis / 1000);
      this.logger.debug(`Fee ratio: ${feePerByte} sat/byte`);
      return feePerByte;
    } catch (e) {
      throw this.wrapError('Failed to get fee ratio from Firo ElectrumX', e);
    }
  };

  isTxInMempool = async (txId: string): Promise<boolean> => {
    try {
      await this.ensureConnected();
      const tx = (await this.sendRequest('blockchain.transaction.get', [
        txId,
        true,
      ])) as FiroVerboseTransaction;
      return (tx.confirmations ?? 0) <= 0;
    } catch {
      return false;
    }
  };

  getTransactionHex = async (txId: string): Promise<string> => {
    try {
      await this.ensureConnected();
      const txHex = (await this.sendRequest('blockchain.transaction.get', [
        txId,
      ])) as string;
      this.logger.debug(`Fetched transaction hex for txId [${txId}]`);
      return txHex;
    } catch (e) {
      throw this.wrapError(
        `Failed to get transaction hex [${txId}] from Firo ElectrumX`,
        e,
      );
    }
  };

  // Transaction ID resolution.

  protected getTxConfirmationSigned = async (
    transactionId: string,
  ): Promise<number> => {
    try {
      await this.ensureConnected();
      const tx = (await this.sendRequest('blockchain.transaction.get', [
        transactionId,
        true,
      ])) as FiroVerboseTransaction;
      const confirmations = tx.confirmations ?? 0;
      if (confirmations <= 0) {
        this.logger.debug(`tx [${transactionId}] has no confirmations`);
        return -1;
      }
      this.logger.debug(
        `tx [${transactionId}] has ${confirmations} confirmations`,
      );
      return confirmations;
    } catch (e) {
      if (e instanceof Error && e.message.includes('No such transaction')) {
        this.logger.debug(`tx [${transactionId}] is not found`);
        return -1;
      }
      this.logger.debug(
        `tx [${transactionId}] verbose lookup failed, ` +
          `assuming unconfirmed: ${e}`,
      );
      return -1;
    }
  };

  /* eslint-disable @typescript-eslint/no-unused-vars */
  protected getSpentTransactionByInputId = async (
    _index: number,
    _txId: string,
  ): Promise<FiroTx | undefined> => {
    // ElectrumX does not have getspentinfo equivalent.
    // This is used as a fallback for getActualTxId.
    // Direct PSBT extraction (method 1) handles most cases.
    return undefined;
  };
  /* eslint-enable @typescript-eslint/no-unused-vars */

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

  /* eslint-disable @typescript-eslint/no-unused-vars */
  protected extractActualTxIdWithRpcLookup = async (
    _psbt: Psbt,
  ): Promise<string | undefined> => {
    // ElectrumX doesn't support getspentinfo, so we can't do RPC-based lookup.
    // Direct PSBT extraction (method 1) handles the common case.
    return undefined;
  };
  /* eslint-enable @typescript-eslint/no-unused-vars */

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
          // Method 2: Fallback (no RPC available for ElectrumX)
          this.logger.debug(
            `Direct PSBT extraction failed for hash [${hash}]. ` +
              'RPC lookup not available with ElectrumX.',
          );
        }
      }
    } catch (e) {
      throw this.wrapError(
        `Failed to get actual txId for tx [${hash}] from database`,
        e,
      );
    }

    return actualTxId;
  };

  // Helpers.

  private resolveHeight = async (blockHash: string): Promise<number> => {
    // Check cache first
    const cached = this.hashToHeight.get(blockHash);
    if (cached !== undefined) return cached;

    // Try to find it by searching from current height backwards
    await this.ensureConnected();
    const searchStart =
      this.lastKnownHeight > 0
        ? this.lastKnownHeight
        : (
            (await this.sendRequest('blockchain.headers.subscribe', [])) as {
              height: number;
            }
          ).height;
    this.lastKnownHeight = searchStart;

    // Search up to 1000 blocks back (~42 hours at 2 blocks per 5 minutes)
    for (let h = searchStart; h > searchStart - 1000 && h > 0; h--) {
      const headerHex = (await this.sendRequest('blockchain.block.header', [
        h,
      ])) as string;
      const headerBytes = Buffer.from(headerHex, 'hex');
      if (headerBytes.length < 80) continue;
      const hash = reverseHex(doubleSha256(headerBytes).toString('hex'));
      this.hashToHeight.set(hash, h);
      if (hash === blockHash) return h;
    }

    throw new Error(
      `Block [${blockHash}] not found within 1000 blocks ` +
        `of height ${searchStart}`,
    );
  };

  /**
   * Parse a raw Firo transaction hex into a FiroTx object.
   * Firo packs transaction type into the upper 16 bits of the version field.
   */
  private parseTransactionHex = (hex: string, txid: string): FiroTx => {
    const buf = Buffer.from(hex, 'hex');
    let offset = 0;

    // Version/type field (4 bytes, LE)
    offset += 4;

    // Vin
    const [vinCount, newOffset1] = readVarInt(buf, offset);
    offset = newOffset1;
    const inputs: Array<{ txId: string; index: number; scriptPubKey: string }> =
      [];
    for (let i = 0; i < vinCount; i++) {
      // Previous tx hash (32 bytes)
      const prevTxHash = buf.subarray(offset, offset + 32);
      offset += 32;
      // Previous output index (4 bytes, LE)
      const prevIndex = buf.readUInt32LE(offset);
      offset += 4;
      // ScriptSig length (varint)
      const [scriptSigLen, scriptOffset] = readVarInt(buf, offset);
      offset = scriptOffset;
      // ScriptSig
      const scriptSig = buf
        .subarray(offset, offset + scriptSigLen)
        .toString('hex');
      offset += scriptSigLen;
      // Sequence (4 bytes)
      offset += 4;

      const txIdStr = prevTxHash.reverse().toString('hex');
      const isCoinbase =
        txIdStr ===
        '0000000000000000000000000000000000000000000000000000000000000000';
      inputs.push({
        txId: isCoinbase ? '' : txIdStr,
        index: isCoinbase ? -1 : prevIndex,
        scriptPubKey: scriptSig,
      });
    }

    // Vout
    const [voutCount, newOffset2] = readVarInt(buf, offset);
    offset = newOffset2;
    const outputs: Array<{ scriptPubKey: string; value: bigint }> = [];
    for (let i = 0; i < voutCount; i++) {
      // Value (8 bytes, LE, as BigInt)
      const value = buf.readBigInt64LE(offset);
      offset += 8;
      // ScriptPubKey length (varint)
      const [scriptLen, scriptOff] = readVarInt(buf, offset);
      offset = scriptOff;
      // ScriptPubKey
      const scriptPubKey = buf
        .subarray(offset, offset + scriptLen)
        .toString('hex');
      offset += scriptLen;

      outputs.push({ scriptPubKey, value });
    }

    return { id: txid, inputs, outputs };
  };

  private wrapError = (baseMessage: string, e: unknown): Error => {
    if (
      e instanceof FailedError ||
      e instanceof NetworkError ||
      e instanceof UnexpectedApiError
    ) {
      return e;
    }
    if (e instanceof Error) {
      return new NetworkError(`${baseMessage}: ${e.message}`);
    }
    return new UnexpectedApiError(`${baseMessage}: Unknown error`);
  };
}

export default FiroElectrumXNetwork;
