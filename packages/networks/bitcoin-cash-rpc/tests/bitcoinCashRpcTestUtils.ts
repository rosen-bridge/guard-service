import {
  binToHex,
  encodeCashAddress,
  CashAddressType,
  encodeTransactionBCH,
  hashTransaction,
  hexToBin,
  secp256k1,
} from '@bitauth/libauth';

import { TransactionType } from '@rosen-chains/abstract-chain';
import {
  BitcoinCashPrevout,
  BitcoinCashTransaction,
  bchP2pkhScriptFromPublicKey,
  getBchSigningDigest,
} from '@rosen-chains/bitcoin-cash';
import { decodeBchTransaction } from '@rosen-chains/bitcoin-cash';

import { RpcTransport } from '../lib/types';
import { fixtureKeyHex, tip, block } from './bitcoinCashRpcTestData';

// Fixed synthetic fixture key, never a funded wallet or operator credential.
const fixtureKey = hexToBin(fixtureKeyHex);
const key = secp256k1.derivePublicKeyCompressed(fixtureKey);
if (typeof key === 'string') throw Error(key);
/** Compressed public key corresponding to the deterministic scalar-1 fixture. */
export const publicKey = binToHex(key);
/** Ordinary native P2PKH script matching the fixed public key. */
export const script = bchP2pkhScriptFromPublicKey(publicKey);
/** Canonical mainnet CashAddr for the synthetic native treasury script. */
export const address = encodeCashAddress({
  prefix: 'bitcoincash',
  type: CashAddressType.p2pkh,
  payload: hexToBin(script.slice(6, 46)),
}).address;

/**
 * Encode a synthetic parent with one native treasury output.
 * @param coinbase - Use a coinbase input; defaults to false
 * @param token - Attach a CashToken to the output; defaults to false
 * @returns Canonical parent bytes used by the RPC fixtures
 */
export const parentBytes = (coinbase = false, token = false) =>
  encodeTransactionBCH({
    version: 2,
    locktime: 0,
    inputs: [
      {
        outpointTransactionHash: hexToBin((coinbase ? '00' : '12').repeat(32)),
        outpointIndex: coinbase ? 0xffffffff : 0,
        sequenceNumber: 0xffffffff,
        unlockingBytecode: Uint8Array.of(1, 1),
      },
    ],
    outputs: [
      {
        lockingBytecode: hexToBin(script),
        valueSatoshis: 100_000n,
        ...(token
          ? { token: { category: hexToBin('ef'.repeat(32)), amount: 1n } }
          : {}),
      },
    ],
  });
/** Canonical synthetic parent bytes with one native treasury output. */
export const parent = parentBytes();
/** Pinned double-SHA256 identifier of the independently serialized parent. */
export const parentId = hashTransaction(parent);
/** Authenticated parent output and exact raw context for the payment fixture. */
export const prevout: BitcoinCashPrevout = {
  txId: parentId,
  index: 0,
  value: 100_000n,
  scriptPubKey: script,
  parentTransactionHex: binToHex(parent),
};
/** Canonical unsigned native payment spending the authenticated parent. */
export const unsigned = encodeTransactionBCH({
  version: 2,
  locktime: 0,
  inputs: [
    {
      outpointTransactionHash: hexToBin(parentId),
      outpointIndex: 0,
      sequenceNumber: 0xffffffff,
      unlockingBytecode: new Uint8Array(),
    },
  ],
  outputs: [{ lockingBytecode: hexToBin(script), valueSatoshis: 99_000n }],
});
const signature = secp256k1.signMessageHashCompact(
  fixtureKey,
  getBchSigningDigest(unsigned, [prevout], script, 0),
);
if (typeof signature === 'string') throw Error(signature);
/** Unsigned approval envelope carrying the exact parent context. */
export const envelope = new BitcoinCashTransaction(
  'fixture-event',
  unsigned,
  TransactionType.payment,
  [prevout],
  publicKey,
);
/** Signed fixture envelope generated from the known scalar-1 key. */
export const signedEnvelope = envelope.withSignatures([binToHex(signature)]);
/** Canonical signed bytes retained by the fixture recovery response. */
export const signed = signedEnvelope.txBytes;
/** Canonical transaction identifier of the signed fixture bytes. */
export const signedId = hashTransaction(signed);

/**
 * Project verbose RPC metadata from decoded transaction bytes.
 * @param bytes - Transaction bytes; defaults to the synthetic parent
 * @param confirmed - Add fixed block and confirmation fields; defaults to false
 * @returns Verbose metadata whose faults can be isolated by the caller
 */
export const metadata = (bytes = parent, confirmed = false) => {
  // Test metadata is projected from real libauth decoding, then faulted one field at a time.
  const tx = importDecoded(bytes);
  const txid = hashTransaction(bytes);
  return {
    hex: binToHex(bytes),
    txid,
    hash: txid,
    size: bytes.length,
    version: tx.version,
    locktime: tx.locktime,
    vin: tx.inputs.map((input) => ({
      ...(binToHex(input.outpointTransactionHash) === '00'.repeat(32) &&
      input.outpointIndex === 0xffffffff
        ? { coinbase: binToHex(input.unlockingBytecode) }
        : {
            txid: binToHex(input.outpointTransactionHash),
            vout: input.outpointIndex,
            scriptSig: { hex: binToHex(input.unlockingBytecode) },
          }),
      sequence: input.sequenceNumber,
    })),
    vout: tx.outputs.map((output, n) => ({
      n,
      value: (Number(output.valueSatoshis) / 1e8).toFixed(8),
      scriptPubKey: { hex: binToHex(output.lockingBytecode) },
    })),
    ...(confirmed
      ? { blockhash: block, confirmations: 6, blocktime: 100, time: 100 }
      : {}),
  };
};

/**
 * Decode synthetic bytes using the provider's one-million-byte raw limit.
 * @param bytes - Canonical transaction bytes
 * @returns Decoded BCH transaction fields
 */
const importDecoded = (bytes: Uint8Array) =>
  decodeBchTransaction(bytes, 1_000_000);

/**
 * Create deterministic BCHN replies and retain every requested method/argument.
 * @param options - Defaults to ordinary parent, confirmed current output and one history row;
 * parent/current/history replace those fixtures, while mutate faults a selected reply
 * @returns Injected transport, recorded calls and the configured parent hash
 */
export const fixture = (
  options: {
    parent?: Uint8Array;
    current?: unknown;
    history?: unknown[];
    mutate?: (
      method: string,
      value: unknown,
      params: readonly unknown[],
    ) => unknown;
  } = {},
) => {
  const raw = options.parent ?? parent;
  const id = hashTransaction(raw);
  const calls: { method: string; params: readonly unknown[] }[] = [];
  const transport: RpcTransport = {
    /**
     * Return an isolated fixture reply, optionally faulted after recording the request.
     * @param method - Method selecting a deterministic fixture response
     * @param params - Positional arguments retained for assertions
     * @returns A cloned response or the configured mutation result
     */
    call: async (method, params) => {
      calls.push({ method, params });
      let value: unknown;
      switch (method) {
        case 'getnetworkinfo':
          value = {
            subversion: '/Bitcoin Cash Node:29.1.0(EB32.0)/',
            version: 29010000,
          };
          break;
        case 'getblockchaininfo':
          value = { chain: 'regtest', bestblockhash: tip, blocks: 100 };
          break;
        case 'getbestblockhash':
          value = tip;
          break;
        case 'getwalletinfo':
          value = { txcount: 2 };
          break;
        case 'getindexinfo':
          value = { txindex: { synced: true, best_block_height: 100 } };
          break;
        case 'gettransaction':
          value = {
            txid: String(params[0]),
            hex: params[0] === signedId ? binToHex(signed) : binToHex(raw),
            confirmations: 0,
            abandoned: false,
          };
          break;
        case 'getaddressinfo':
          value = { iswatchonly: true, ismine: false, scriptPubKey: script };
          break;
        case 'listunspent':
          value = [
            {
              txid: id,
              vout: 0,
              amount: '0.00100000',
              scriptPubKey: script,
              confirmations: 6,
            },
          ];
          break;
        case 'getrawtransaction':
          value =
            params[0] === signedId
              ? metadata(signed, params.length === 3)
              : metadata(raw);
          break;
        case 'gettxout':
          value =
            options.current === undefined
              ? {
                  bestblock: tip,
                  confirmations: 6,
                  coinbase:
                    importDecoded(raw).inputs[0].outpointIndex === 0xffffffff,
                  value: '0.00100000',
                  scriptPubKey: { hex: script },
                }
              : options.current;
          break;
        case 'getblockheader':
          value = {
            hash: block,
            height: 95,
            confirmations: 6,
            time: 100,
            previousblockhash: 'de'.repeat(32),
          };
          break;
        case 'getblockhash':
          value = block;
          break;
        case 'getblock':
          value = { hash: block, height: 95, confirmations: 6, tx: [signedId] };
          break;
        case 'getrawmempool':
          value = [signedId];
          break;
        case 'listtransactions':
          value = (
            options.history ?? [{ txid: signedId, confirmations: 0 }]
          ).slice(Number(params[2]), Number(params[2]) + Number(params[1]));
          break;
        case 'sendrawtransaction':
          value = signedId;
          break;
        default:
          throw Error(`Unexpected fixture RPC method ${method}`);
      }
      return options.mutate
        ? options.mutate(method, structuredClone(value), params)
        : structuredClone(value);
    },
  };
  return { transport, calls, id };
};
