import {
  binToHex,
  CashAddressType,
  encodeCashAddress,
  hashTransaction,
  hexToBin,
  secp256k1,
} from '@bitauth/libauth';

import { encodeAddress } from '@rosen-bridge/address-codec';
import {
  AssetBalance,
  BlockInfo,
  TokenDetail,
} from '@rosen-chains/abstract-chain';
import {
  AbstractBitcoinCashNetwork,
  BitcoinCashPrevout,
  BitcoinCashTransaction,
  BitcoinCashTx,
  BitcoinCashUtxo,
  decodeBchTransaction,
  getBchOutpointId,
  getBchUnsignedBytes,
  isSameBchTransactionBody,
} from '@rosen-chains/bitcoin-cash';

import {
  BitcoinCashRpcError,
  boundedInteger,
  createBitcoinCashRpcTransport,
} from './transport';
import { BitcoinCashRpcConfig, RpcTransport } from './types';
import {
  array,
  hash,
  hex,
  rawTransaction,
  record,
  satoshis,
  uint,
} from './validation';

/** Operator-trusted BCHN RPC; address discovery requires an imported wallet address. */
class BitcoinCashRpcNetwork extends AbstractBitcoinCashNetwork {
  private readonly rpc: RpcTransport;
  private readonly expectedChain: BitcoinCashRpcConfig['expectedChain'];
  private readonly maxUtxos: number;
  private readonly maxMempool: number;
  private readonly maxBlock: number;
  private readonly historyPageSize: number;
  private readonly historyPages: number;

  /**
   * Configure a BCHN provider with explicit chain identity and bounded work.
   * @param config - Endpoint, chain and optional limits; omitted limits use bounded defaults
   * @param transport - Optional injected transport; defaults to the configured HTTP transport
   */
  constructor(config: BitcoinCashRpcConfig, transport?: RpcTransport) {
    super();
    if (!['main', 'test', 'regtest'].includes(config.expectedChain))
      throw Error('Explicit BCH RPC chain required');
    this.expectedChain = config.expectedChain;
    this.rpc = transport ?? createBitcoinCashRpcTransport(config);
    this.maxUtxos = boundedInteger(config.maxUtxos, 1000, 10_000);
    this.maxMempool = boundedInteger(
      config.maxMempoolTransactions,
      1000,
      10_000,
    );
    this.maxBlock = boundedInteger(
      config.maxBlockTransactions,
      10_000,
      100_000,
    );
    this.historyPageSize = boundedInteger(
      config.walletHistoryPageSize,
      100,
      500,
    );
    this.historyPages = boundedInteger(config.maxWalletHistoryPages, 20, 100);
  }

  /**
   * Check the reported BCHN implementation and configured chain identity.
   * @returns The validated chain tip hash and height
   */
  private identity = async (): Promise<{ tip: string; height: number }> => {
    const network = record(await this.rpc.call('getnetworkinfo', []));
    if (
      typeof network.subversion !== 'string' ||
      !/^\/Bitcoin Cash Node:[0-9]+\.[0-9]+\.[0-9]+(?:\([^/()\r\n]{1,64}\))?\/$/.test(
        network.subversion,
      )
    )
      throw Error('RPC is not Bitcoin Cash Node');
    const chain = record(await this.rpc.call('getblockchaininfo', []));
    if (chain.chain !== this.expectedChain)
      throw Error('BCH RPC chain identity mismatch');
    return { tip: hash(chain.bestblockhash), height: uint(chain.blocks) };
  };

  /**
   * Decode a native address and encode its payload for the configured RPC chain.
   * @param address - Address accepted by the dedicated BCH codec
   * @returns The chain-specific CashAddr and canonical locking script
   */
  private address = (
    address: string,
  ): { rpcAddress: string; script: string } => {
    const script = encodeAddress('bitcoin-cash', address);
    const p2pkh = /^76a914([0-9a-f]{40})88ac$/.exec(script);
    const p2sh = /^a914([0-9a-f]{40})87$/.exec(script);
    const payload = p2pkh?.[1] ?? p2sh?.[1];
    if (!payload) throw Error('Unsupported native BCH address script');
    const prefix =
      this.expectedChain === 'main'
        ? 'bitcoincash'
        : this.expectedChain === 'test'
          ? 'bchtest'
          : 'bchreg';
    return {
      script,
      rpcAddress: encodeCashAddress({
        prefix,
        type: p2pkh ? CashAddressType.p2pkh : CashAddressType.p2sh,
        payload: hexToBin(payload),
      }).address,
    };
  };

  /**
   * Parse a canonical transaction-hash.output-index identifier.
   * @param id - Lowercase hash and decimal uint32 output index separated by a dot
   * @returns The transaction hash and output index
   */
  private outpoint = (id: string): { txId: string; index: number } => {
    const match = /^([0-9a-f]{64})\.(0|[1-9][0-9]{0,9})$/.exec(id);
    if (!match) throw Error('Invalid BCH outpoint id');
    return { txId: match[1], index: uint(Number(match[2]), 0xffffffff) };
  };

  /**
   * Fetch transaction bytes and validate their identity and verbose metadata.
   * @param txId - Canonical transaction hash
   * @param blockHash - Optional required block; omission permits retained-wallet fallback
   * @returns The validated raw transaction and decoded bytes
   */
  private raw = async (txId: string, blockHash?: string) => {
    hash(txId);
    if (blockHash !== undefined) hash(blockHash);
    try {
      const raw = rawTransaction(
        await this.rpc.call(
          'getrawtransaction',
          blockHash === undefined ? [txId, true] : [txId, true, blockHash],
        ),
        txId,
      );
      if (blockHash !== undefined && raw.metadata.blockhash !== blockHash)
        throw Error('Raw transaction requested block mismatch');
      return raw;
    } catch (error) {
      if (
        !(error instanceof BitcoinCashRpcError) ||
        error.code !== -5 ||
        blockHash !== undefined
      )
        throw error;
      // A spent wallet parent can be recovered without txindex if its block is retained.
      const wallet = record(
        await this.rpc.call('gettransaction', [txId, true]),
      );
      if (wallet.txid !== txId)
        throw Error('Wallet transaction identity mismatch');
      const block = hash(wallet.blockhash);
      const raw = rawTransaction(
        await this.rpc.call('getrawtransaction', [txId, true, block]),
        txId,
      );
      if (raw.metadata.blockhash !== block)
        throw Error('Wallet parent block mismatch');
      return raw;
    }
  };

  /**
   * Resolve a positive native prevout from validated parent transaction bytes.
   * @param id - Canonical outpoint identifier
   * @returns The exact prevout context and parent coinbase status
   */
  private parent = async (
    id: string,
  ): Promise<{ prevout: BitcoinCashPrevout; coinbase: boolean }> => {
    const { txId, index } = this.outpoint(id);
    const raw = await this.raw(txId);
    const output = raw.decoded.outputs[index];
    if (!output) throw Error('Authenticated parent output missing');
    if (output.token !== undefined)
      throw Error('CashTokens prevouts are unsupported');
    if (output.valueSatoshis <= 0n) throw Error('Invalid parent output value');
    return {
      prevout: {
        txId,
        index,
        value: output.valueSatoshis,
        scriptPubKey: binToHex(output.lockingBytecode),
        parentTransactionHex: raw.metadata.hex,
      },
      coinbase: raw.coinbase,
    };
  };

  /**
   * Compare current UTXO metadata with its validated parent at a specified tip.
   * @param parent - Parent-derived prevout context and coinbase status
   * @param tip - Expected current chain tip hash
   * @returns A confirmed mature UTXO, or undefined when spent, unconfirmed or immature
   */
  private current = async (
    parent: { prevout: BitcoinCashPrevout; coinbase: boolean },
    tip: string,
  ): Promise<BitcoinCashUtxo | undefined> => {
    const { prevout, coinbase } = parent;
    const response = await this.rpc.call('gettxout', [
      prevout.txId,
      prevout.index,
      true,
    ]);
    if (response === null) return undefined;
    const item = record(response);
    const confirmations = uint(item.confirmations);
    if (
      item.bestblock !== tip ||
      typeof item.coinbase !== 'boolean' ||
      item.coinbase !== coinbase ||
      satoshis(item.value) !== prevout.value ||
      record(item.scriptPubKey).hex !== prevout.scriptPubKey ||
      (item.tokenData !== undefined && item.tokenData !== null)
    )
      throw Error('Current UTXO metadata mismatch');
    if (confirmations === 0 || (coinbase && confirmations < 100))
      return undefined;
    return { ...prevout, confirmations, coinbase };
  };

  /**
   * Fetch a header and cross-check its reported current-chain membership.
   * @param blockId - Canonical block hash
   * @returns The validated header metadata and normalized block information
   */
  private header = async (blockId: string) => {
    hash(blockId);
    const block = record(
      await this.rpc.call('getblockheader', [blockId, true]),
    );
    if (block.hash !== blockId || uint(block.confirmations) < 1)
      throw Error('Block is not in the current main chain');
    const height = uint(block.height);
    if ((await this.rpc.call('getblockhash', [height])) !== blockId)
      throw Error('Block height/hash mismatch');
    uint(block.time);
    const parentHash =
      height === 0 ? '00'.repeat(32) : hash(block.previousblockhash);
    return {
      block,
      info: { hash: blockId, parentHash, height } satisfies BlockInfo,
    };
  };

  /**
   * Validate block metadata and its bounded, unique transaction identifiers.
   * @param blockId - Canonical block hash
   * @returns The validated header and ordered transaction identifiers
   */
  private blockTransactions = async (blockId: string) => {
    const header = await this.header(blockId);
    const block = record(await this.rpc.call('getblock', [blockId, 1]));
    if (
      block.hash !== blockId ||
      block.height !== header.info.height ||
      block.confirmations !== header.block.confirmations
    )
      throw Error('Block metadata mismatch');
    const ids = array(block.tx, this.maxBlock).map(hash);
    if (!ids.length || new Set(ids).size !== ids.length)
      throw Error('Invalid block transaction membership');
    return { ...header, ids };
  };

  /**
   * Validate transaction identity, block membership and a stable confirmation view.
   * @param txId - Canonical transaction hash
   * @param blockId - Required containing block hash
   * @returns The validated verbose transaction metadata
   */
  private transaction = async (
    txId: string,
    blockId: string,
  ): Promise<BitcoinCashTx> => {
    hash(txId);
    const block = await this.blockTransactions(blockId);
    if (!block.ids.includes(txId))
      throw Error('Transaction is not a member of the requested block');
    const raw = await this.raw(txId, blockId);
    if (
      raw.metadata.blockhash !== blockId ||
      raw.metadata.confirmations !== block.block.confirmations ||
      raw.metadata.blocktime !== block.block.time
    )
      throw Error('Transaction block metadata mismatch');
    // Recheck exact main-chain membership after fetching bytes.
    const after = await this.header(blockId);
    if (after.block.confirmations !== block.block.confirmations)
      throw Error('Block changed during transaction read');
    return raw.metadata;
  };

  /**
   * Read the height after checking BCHN and chain identity.
   * @returns The validated chain height
   */
  getHeight = async (): Promise<number> => (await this.identity()).height;
  /**
   * Read block information after checking provider and block identity.
   * @param blockId - Canonical block hash
   * @returns Normalized current-chain block information
   */
  getBlockInfo = async (blockId: string): Promise<BlockInfo> => {
    await this.identity();
    return (await this.header(blockId)).info;
  };
  /**
   * Read a bounded block transaction list after checking provider identity.
   * @param blockId - Canonical block hash
   * @returns The validated unique transaction identifiers in block order
   */
  getBlockTransactionIds = async (blockId: string): Promise<string[]> => {
    await this.identity();
    return (await this.blockTransactions(blockId)).ids;
  };
  /**
   * Read a transaction bound to a validated current-chain block.
   * @param txId - Canonical transaction hash
   * @param blockId - Required containing block hash
   * @returns Verbose metadata cross-checked against raw bytes and block membership
   */
  getTransaction = async (
    txId: string,
    blockId: string,
  ): Promise<BitcoinCashTx> => {
    await this.identity();
    return this.transaction(txId, blockId);
  };
  /**
   * Read canonical transaction bytes with validated identity and metadata.
   * @param txId - Canonical transaction hash
   * @returns The validated raw hexadecimal transaction
   */
  getTransactionHex = async (txId: string): Promise<string> => {
    await this.identity();
    return (await this.raw(txId)).metadata.hex;
  };
  /**
   * Read native parent-output context without requiring that it remains unspent.
   * @param id - Canonical outpoint identifier
   * @returns Exact value, script and parent transaction bytes
   */
  getPrevout = async (id: string): Promise<BitcoinCashPrevout> => {
    await this.identity();
    return (await this.parent(id)).prevout;
  };
  /**
   * Read an unspent, confirmed and mature native output at the current tip.
   * @param id - Canonical outpoint identifier
   * @returns Validated current UTXO context, or undefined for an unusable output
   */
  getUtxo = async (id: string): Promise<BitcoinCashUtxo | undefined> => {
    const { tip } = await this.identity();
    return this.current(await this.parent(id), tip);
  };
  /**
   * Check whether the current output is usable as a native treasury input.
   * @param id - Canonical outpoint identifier
   * @returns Whether getUtxo resolves a confirmed, mature output
   */
  isBoxUnspentAndValid = async (id: string): Promise<boolean> =>
    (await this.getUtxo(id)) !== undefined;

  /**
   * Cross-check bounded imported-wallet outputs against parent and current data.
   * @param address - Native BCH address whose payload is translated for RPC
   * @param tip - Expected current chain tip hash
   * @returns Usable native outputs sorted by transaction hash and output index
   */
  private addressBoxes = async (
    address: string,
    tip: string,
  ): Promise<BitcoinCashUtxo[]> => {
    const target = this.address(address);
    const wallet = record(
      await this.rpc.call('getaddressinfo', [target.rpcAddress]),
    );
    if (
      (wallet.ismine !== true && wallet.iswatchonly !== true) ||
      wallet.scriptPubKey !== target.script
    )
      throw Error(
        'Address must be imported in the BCHN wallet before observation or rescanned',
      );
    const rows = array(
      await this.rpc.call('listunspent', [
        1,
        9999999,
        [target.rpcAddress],
        true,
        { maximumCount: this.maxUtxos + 1 },
      ]),
      this.maxUtxos,
    );
    const seen = new Set<string>();
    const boxes: BitcoinCashUtxo[] = [];
    for (const value of rows) {
      const row = record(value);
      const id = getBchOutpointId(hash(row.txid), uint(row.vout, 0xffffffff));
      if (seen.has(id)) throw Error('Duplicate wallet outpoint');
      seen.add(id);
      const parent = await this.parent(id);
      if (
        parent.prevout.scriptPubKey !== target.script ||
        row.scriptPubKey !== target.script ||
        satoshis(row.amount) !== parent.prevout.value ||
        uint(row.confirmations) < 1 ||
        (row.tokenData !== undefined && row.tokenData !== null)
      )
        throw Error('Wallet UTXO metadata mismatch');
      const current = await this.current(parent, tip);
      if (!current) continue;
      if (row.confirmations !== current.confirmations)
        throw Error('Wallet UTXO confirmations mismatch');
      boxes.push(current);
    }
    return boxes.sort(
      (a, b) => a.txId.localeCompare(b.txId) || a.index - b.index,
    );
  };

  /**
   * Return a bounded slice of validated native outputs for an imported address.
   * @param address - Native BCH address
   * @param offset - Nonnegative starting index within the configured UTXO limit
   * @param limit - Nonnegative result count within the configured UTXO limit
   * @returns The requested slice of confirmed, mature native outputs
   */
  getAddressBoxes = async (
    address: string,
    offset: number,
    limit: number,
  ): Promise<BitcoinCashUtxo[]> => {
    uint(offset, this.maxUtxos);
    uint(limit, this.maxUtxos);
    const { tip } = await this.identity();
    return (await this.addressBoxes(address, tip)).slice(
      offset,
      offset + limit,
    );
  };
  /**
   * Sum validated usable native outputs for an imported wallet address.
   * @param address - Native BCH address
   * @returns Exact native satoshis and an empty token balance list
   */
  getAddressAssets = async (address: string): Promise<AssetBalance> => {
    const { tip } = await this.identity();
    const boxes = await this.addressBoxes(address, tip);
    return {
      nativeToken: boxes.reduce((sum, box) => sum + box.value, 0n),
      tokens: [],
    };
  };
  /**
   * Return the native BCH asset description after checking provider identity.
   * @param tokenId - Native identifier bch; other identifiers are rejected
   * @returns Native BCH metadata with eight decimals
   */
  getTokenDetail = async (tokenId: string): Promise<TokenDetail> => {
    await this.identity();
    if (tokenId !== 'bch')
      throw Error('Native BCH adapter does not support tokens');
    return { tokenId: 'bch', name: 'BitcoinCash', decimals: 8 };
  };

  /**
   * Resolve signed transaction confirmations or authenticated index-backed absence.
   * @param txId - Canonical actual transaction hash, not an unsigned approval ID
   * @returns Confirmations, zero for current mempool presence, or -1 for validated absence
   */
  getTxConfirmation = async (txId: string): Promise<number> => {
    const identity = await this.identity();
    hash(txId);
    let raw: Awaited<ReturnType<BitcoinCashRpcNetwork['raw']>>;
    try {
      raw = await this.raw(txId);
    } catch (error) {
      if (error instanceof BitcoinCashRpcError && error.code === -5) {
        let index: Record<string, unknown>;
        try {
          index = record(
            record(await this.rpc.call('getindexinfo', [])).txindex,
          );
        } catch {
          throw Error(
            'Global transaction absence unavailable: a current txindex is required',
          );
        }
        if (
          index.synced !== true ||
          index.best_block_height !== identity.height ||
          (await this.rpc.call('getbestblockhash', [])) !== identity.tip
        )
          throw Error(
            'Global transaction absence unavailable: txindex is missing, unsynced, or stale',
          );
        return -1;
      }
      throw error;
    }
    if (
      !raw.coinbase &&
      raw.decoded.inputs.some((input) => !input.unlockingBytecode.length)
    )
      throw Error('Unsigned transaction cannot establish an actual signed ID');
    if (raw.metadata.blockhash !== undefined)
      return uint(
        (await this.transaction(txId, raw.metadata.blockhash)).confirmations,
      );
    if (
      raw.metadata.confirmations !== undefined &&
      raw.metadata.confirmations !== 0
    )
      throw Error('Unbound transaction confirmations');
    if (!(await this.mempoolIds()).includes(txId))
      throw Error('Unconfirmed transaction absent from current mempool');
    return 0;
  };

  /**
   * Validate the bounded current mempool identifier list.
   * @returns Unique canonical transaction hashes sorted lexicographically
   */
  private mempoolIds = async (): Promise<string[]> => {
    const ids = array(
      await this.rpc.call('getrawmempool', [false]),
      this.maxMempool,
    ).map(hash);
    if (new Set(ids).size !== ids.length)
      throw Error('Duplicate mempool transaction');
    return ids.sort();
  };
  /**
   * Check an actual transaction hash against the validated current mempool.
   * @param txId - Canonical transaction hash
   * @returns Whether the hash occurs in the bounded unique mempool list
   */
  isTxInMempool = async (txId: string): Promise<boolean> => {
    await this.identity();
    hash(txId);
    return (await this.mempoolIds()).includes(txId);
  };
  /**
   * Read and validate signed noncoinbase bytes for each current mempool entry.
   * @returns Validated unconfirmed verbose transaction metadata
   */
  getMempoolTransactions = async (): Promise<BitcoinCashTx[]> => {
    await this.identity();
    const result: BitcoinCashTx[] = [];
    for (const id of await this.mempoolIds()) {
      const raw = await this.raw(id);
      if (
        raw.coinbase ||
        raw.metadata.blockhash !== undefined ||
        (raw.metadata.confirmations !== undefined &&
          raw.metadata.confirmations !== 0) ||
        raw.decoded.inputs.some((input) => !input.unlockingBytecode.length)
      )
        throw Error('Invalid mempool transaction');
      result.push(raw.metadata);
    }
    return result;
  };

  /**
   * Revalidate a signed envelope and its current inputs before sending exact bytes.
   * @param transaction - Signed BCH envelope with retained parent context
   * @returns Completion only when the RPC returns the envelope's actual signed ID
   */
  submitTransaction = async (
    transaction: BitcoinCashTransaction,
  ): Promise<void> => {
    transaction.validate();
    if (!transaction.isSigned())
      throw Error('Refusing unsigned BCH transaction');
    const actualId = hash(transaction.getActualTxId());
    const signedHex = transaction.getTxHexString();
    const { tip } = await this.identity();
    for (const prevout of transaction.prevouts) {
      const parent = await this.parent(
        getBchOutpointId(prevout.txId, prevout.index),
      );
      if (
        parent.prevout.parentTransactionHex !== prevout.parentTransactionHex ||
        parent.prevout.value !== prevout.value ||
        parent.prevout.scriptPubKey !== prevout.scriptPubKey ||
        !(await this.current(parent, tip))
      )
        throw Error(
          'Submission prevout is spent, immature, or differs from the signed envelope',
        );
    }
    // Verify mutable envelope bytes again immediately before the irreversible RPC.
    transaction.validate();
    if (
      !transaction.isSigned() ||
      transaction.getActualTxId() !== actualId ||
      transaction.getTxHexString() !== signedHex
    )
      throw Error('Signed envelope changed during submission');
    if ((await this.rpc.call('sendrawtransaction', [signedHex])) !== actualId)
      throw Error('Submitted actual transaction ID mismatch');
  };

  /**
   * Check the canonical P2PKH ECDSA witness shape of recovery candidates.
   * @param bytes - Canonical candidate transaction bytes
   * @returns Whether every input has the expected DER ForkID and compressed-key shape
   */
  private signedCandidate = (bytes: Uint8Array): boolean => {
    const tx = decodeBchTransaction(bytes);
    return tx.inputs.every((input) => {
      const witness = input.unlockingBytecode;
      const length = witness[0];
      if (
        length < 9 ||
        length > 73 ||
        witness.length !== length + 35 ||
        witness[length] !== 0x41 ||
        witness[length + 1] !== 33
      )
        return false;
      const compact = secp256k1.signatureDERToCompact(witness.slice(1, length));
      if (typeof compact === 'string') return false;
      const canonical = secp256k1.signatureCompactToDER(compact);
      return (
        typeof canonical !== 'string' &&
        binToHex(canonical) === binToHex(witness.slice(1, length)) &&
        secp256k1.validatePublicKey(witness.slice(length + 2))
      );
    });
  };

  /**
   * Search bounded stable wallet history for signed bytes matching an approved body.
   * @param unsignedBody - Canonical unsigned transaction bytes
   * @returns Matching signed bytes, or undefined only after a complete bounded scan
   */
  findSignedTransaction = async (
    unsignedBody: Uint8Array,
  ): Promise<Uint8Array | undefined> => {
    await this.identity();
    const approved = Uint8Array.from(unsignedBody);
    const tx = decodeBchTransaction(approved);
    if (
      tx.inputs.some((input) => input.unlockingBytecode.length) ||
      binToHex(getBchUnsignedBytes(approved)) !== binToHex(approved)
    )
      throw Error('Recovery requires a canonical unsigned approved body');
    const seen = new Set<string>();
    const tip = await this.rpc.call('getbestblockhash', []);
    hash(tip);
    const walletCount = uint(
      record(await this.rpc.call('getwalletinfo', [])).txcount,
    );
    /**
     * Reject recovery when the observed chain tip or wallet transaction count changed.
     */
    const stableHistory = async () => {
      if (
        (await this.rpc.call('getbestblockhash', [])) !== tip ||
        uint(record(await this.rpc.call('getwalletinfo', [])).txcount) !==
          walletCount
      )
        throw Error('Wallet history changed during recovery');
    };
    for (let page = 0; page < this.historyPages; page++) {
      const rows = array(
        await this.rpc.call('listtransactions', [
          '*',
          this.historyPageSize,
          page * this.historyPageSize,
          true,
        ]),
        this.historyPageSize,
      );
      for (const value of rows) {
        const row = record(value);
        const id = hash(row.txid);
        if (seen.has(id)) continue;
        seen.add(id);
        // Retained wallet history can include orphaned blocks absent from this node.
        // Authenticate wallet bytes before comparing bodies; unrelated rows need no block lookup.
        const wallet = record(
          await this.rpc.call('gettransaction', [id, true]),
        );
        const bytes = hexToBin(hex(wallet.hex, 1_000_000));
        const decoded = decodeBchTransaction(bytes, 1_000_000);
        if (
          wallet.txid !== id ||
          hashTransaction(bytes) !== id ||
          decoded.inputs.length > 4096 ||
          decoded.outputs.length > 4096
        )
          throw Error('Wallet recovery raw identity or cardinality mismatch');
        if (!isSameBchTransactionBody(approved, bytes)) continue;
        // Matching abandoned/conflicted bytes cannot establish absence or a usable recovery.
        if (
          (typeof wallet.confirmations === 'number' &&
            wallet.confirmations < 0) ||
          (typeof row.confirmations === 'number' && row.confirmations < 0) ||
          wallet.abandoned === true
        )
          throw Error(
            'Matching wallet recovery transaction is abandoned or conflicted',
          );
        if (
          uint(wallet.confirmations) !== uint(row.confirmations) ||
          (wallet.abandoned !== undefined &&
            typeof wallet.abandoned !== 'boolean')
        )
          throw Error(
            'Matching wallet recovery transaction state is malformed or changed',
          );
        if (!this.signedCandidate(bytes)) continue;
        await stableHistory();
        return Uint8Array.from(bytes);
      }
      if (rows.length < this.historyPageSize) {
        await stableHistory();
        return undefined;
      }
    }
    throw Error(
      'Wallet recovery history work limit exhausted; absence is not established',
    );
  };
}

export default BitcoinCashRpcNetwork;
