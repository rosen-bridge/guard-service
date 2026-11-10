import {
  binToHex as bchRecovery_binToHex,
  encodeTransactionBCH as bchRecovery_encodeTransactionBCH,
  hashTransaction as bchRecovery_hashTransaction,
  hexToBin as bchRecovery_hexToBin,
  secp256k1 as bchRecovery_secp256k1,
} from '@bitauth/libauth';

import { TokenMap as bchRecovery_TokenMap } from '@rosen-bridge/tokens';
import { TransactionType as bchRecovery_TransactionType } from '@rosen-chains/abstract-chain';
import {
  BitcoinCashChain as bchRecovery_BitcoinCashChain,
  decodeBchTransaction as bchRecovery_decodeBchTransaction,
} from '@rosen-chains/bitcoin-cash';
import { BitcoinCashRpcNetwork as bchRecovery_BitcoinCashRpcNetwork } from '@rosen-chains/bitcoin-cash-rpc';

import { DatabaseAction as bchRecovery_DatabaseAction } from '../../src/db/databaseAction';
import bchRecovery_EventSerializer from '../../src/event/eventSerializer';
import bchRecovery_ChainHandler from '../../src/handlers/chainHandler';
import * as bchRecovery_TransactionSerializer from '../../src/transaction/transactionSerializer';
import { EventStatus as bchRecovery_EventStatus } from '../../src/utils/constants';
import { bchPublicKey as bchRecovery_bchPublicKey } from '../configs/bitcoinCashTestData';
import {
  bchLock as bchRecovery_bchLock,
  bchCold as bchRecovery_bchCold,
} from '../configs/bitcoinCashTestUtils';
import bchRecovery_DatabaseActionMock from '../db/mocked/databaseAction.mock';
import * as bchRecovery_EventTestData from '../event/testData';
import { chainHandlerInstance as bchRecovery_chainHandlerInstance } from '../handlers/chainHandler.mock';

/** Provide the bchRecovery_setup test seam for the current scenario without external requests. */
export const bchRecovery_setup = async (
  rpcMode?: 'actual-rpc' | 'actual-rpc-raw-mismatch',
) => {
  await bchRecovery_DatabaseActionMock.clearTables();
  const event = bchRecovery_EventTestData.mockEventTrigger().event;
  event.toChain = 'bitcoin-cash';
  const eventId = bchRecovery_EventSerializer.getId(event);
  await bchRecovery_DatabaseActionMock.insertEventRecord(
    event,
    bchRecovery_EventStatus.pendingPayment,
  );
  const script = '76a914751e76e8199196d454941c45d1b3a323f1433bd688ac';
  const parent = bchRecovery_encodeTransactionBCH({
    version: 2,
    locktime: 0,
    inputs: [
      {
        outpointTransactionHash: new Uint8Array(32).fill(1),
        outpointIndex: 0,
        sequenceNumber: 0xffffffff,
        unlockingBytecode: new Uint8Array(),
      },
    ],
    outputs: [
      { lockingBytecode: bchRecovery_hexToBin(script), valueSatoshis: 50000n },
    ],
  });
  const box = {
    txId: bchRecovery_hashTransaction(parent),
    index: 0,
    value: 50000n,
    scriptPubKey: script,
    parentTransactionHex: bchRecovery_binToHex(parent),
    coinbase: false,
    confirmations: 1,
  };
  const network = {
    /** Provide the getAddressBoxes test seam for the current scenario without external requests. */
    getAddressBoxes: vi.fn(
      async (_address: string, offset: number, limit: number) =>
        [box].slice(offset, offset + limit),
    ),
    /** Provide the getUtxo test seam for the current scenario without external requests. */
    getUtxo: vi.fn(async () => box),
    /** Provide the getPrevout test seam for the current scenario without external requests. */
    getPrevout: vi.fn(async () => box),
    /** Provide the getHeight test seam for the current scenario without external requests. */
    getHeight: vi.fn(async () => 10),
    /** Provide the isBoxUnspentAndValid test seam for the current scenario without external requests. */
    isBoxUnspentAndValid: vi.fn(async () => true),
    /** Provide the findSignedTransaction test seam for the current scenario without external requests. */
    findSignedTransaction: vi.fn<() => Promise<Uint8Array | undefined>>(
      async () => undefined,
    ),
    /** Provide the getTxConfirmation test seam for the current scenario without external requests. */
    getTxConfirmation: vi.fn(async () => 1),
    /** Provide the isTxInMempool test seam for the current scenario without external requests. */
    isTxInMempool: vi.fn(async () => false),
  };
  const tokens = new bchRecovery_TokenMap();
  await tokens.updateConfigByJson([
    {
      'bitcoin-cash': {
        tokenId: 'bch',
        name: 'BCH',
        decimals: 8,
        type: 'native',
        residency: 'native',
        extra: {},
      },
      ergo: {
        tokenId: 'bb'.repeat(32),
        name: 'rsBCH',
        decimals: 6,
        type: 'wrapped',
        residency: 'wrapped',
        extra: {},
      },
    },
  ]);
  const chainConfig = {
    aggregatedPublicKey: bchRecovery_bchPublicKey,
    feeRate: 1,
    maxFee: 100000n,
    minimumUtxoValue: 546n,
    maxUtxoPages: 2,
    fee: 0n,
    confirmations: {
      observation: 1,
      payment: 1,
      cold: 1,
      manual: 1,
      arbitrary: 1,
    },
    addresses: {
      lock: bchRecovery_bchLock,
      cold: bchRecovery_bchCold,
      permit: '',
      fraud: '',
    },
    rwtId: '',
  };
  let chain = new bchRecovery_BitcoinCashChain(
    network as never,
    chainConfig,
    tokens,
    {
      /** Provide the isInSign test seam for the current scenario without external requests. */
      isInSign: async () => false,
      /** Provide the sign test seam for the current scenario without external requests. */
      sign: async (digest) => ({
        signature: bchRecovery_binToHex(
          bchRecovery_secp256k1.signMessageHashCompact(
            bchRecovery_hexToBin('00'.repeat(31) + '01'),
            digest,
          ) as Uint8Array,
        ),
        signatureRecovery: '0',
      }),
    },
  );
  const generated = await chain.generateTransaction(
    eventId,
    bchRecovery_TransactionType.payment,
    [
      {
        address: bchRecovery_bchCold,
        assets: { nativeToken: 100n, tokens: [] },
      },
    ],
    [],
    [],
  );
  const unsigned = chain.PaymentTransactionFromJson(generated.toJson());
  const signed = chain.PaymentTransactionFromJson(
    (await chain.signTransaction(unsigned)).toJson(),
  );
  network.findSignedTransaction.mockResolvedValue(signed.txBytes);
  const rpcCalls: { method: string; params: readonly unknown[] }[] = [];
  const rpcErrors: string[] = [];
  const forbiddenSign = vi.fn(async () => {
    throw Error('Recovery must not sign');
  });
  if (rpcMode) {
    const actualId = signed.getActualTxId();
    const raw = Uint8Array.from(signed.txBytes);
    if (rpcMode === 'actual-rpc-raw-mismatch') raw[raw.length - 1] ^= 1;
    const tx = bchRecovery_decodeBchTransaction(signed.txBytes);
    const tip = 'ab'.repeat(32);
    const rpc = new bchRecovery_BitcoinCashRpcNetwork(
      {
        url: 'http://offline.invalid',
        expectedChain: 'regtest',
        walletHistoryPageSize: 2,
        maxWalletHistoryPages: 2,
      },
      {
        call: async (method, params) => {
          rpcCalls.push({ method, params });
          switch (method) {
            case 'getnetworkinfo':
              return { subversion: '/Bitcoin Cash Node:28.0.1/' };
            case 'getblockchaininfo':
              return { chain: 'regtest', bestblockhash: tip, blocks: 100 };
            case 'getbestblockhash':
              return tip;
            case 'getwalletinfo':
              return { txcount: 1 };
            case 'listtransactions':
              return params[2] === 0
                ? [{ txid: actualId, confirmations: 0 }]
                : [];
            case 'gettransaction':
              expect(params[0]).toEqual(actualId);
              return {
                txid: actualId,
                hex: bchRecovery_binToHex(raw),
                confirmations: 0,
                abandoned: false,
              };
            case 'getrawtransaction':
              expect(params[0]).toEqual(actualId);
              return {
                hex: bchRecovery_binToHex(signed.txBytes),
                txid: actualId,
                hash: actualId,
                size: signed.txBytes.length,
                version: tx.version,
                locktime: tx.locktime,
                vin: tx.inputs.map((input) => ({
                  txid: bchRecovery_binToHex(input.outpointTransactionHash),
                  vout: input.outpointIndex,
                  scriptSig: {
                    hex: bchRecovery_binToHex(input.unlockingBytecode),
                  },
                  sequence: input.sequenceNumber,
                })),
                vout: tx.outputs.map((output, n) => ({
                  n,
                  value: (Number(output.valueSatoshis) / 1e8).toFixed(8),
                  scriptPubKey: {
                    hex: bchRecovery_binToHex(output.lockingBytecode),
                  },
                })),
                confirmations: 0,
              };
            case 'getrawmempool':
              return [actualId];
            default:
              throw Error(`Recovery fixture forbids RPC method ${method}`);
          }
        },
      },
    );
    const recover = rpc.findSignedTransaction.bind(rpc);
    vi.spyOn(rpc, 'findSignedTransaction').mockImplementation(
      async (...args) => {
        try {
          return await recover(...args);
        } catch (error) {
          rpcErrors.push((error as Error).message);
          throw error;
        }
      },
    );
    chain = new bchRecovery_BitcoinCashChain(rpc, chainConfig, tokens, {
      isInSign: async () => false,
      sign: forbiddenSign,
    });
  }
  vi.spyOn(bchRecovery_ChainHandler, 'getInstance').mockReturnValue(
    bchRecovery_chainHandlerInstance as unknown as bchRecovery_ChainHandler,
  );
  vi.spyOn(bchRecovery_chainHandlerInstance, 'getChain').mockImplementation(
    () => chain as never,
  );
  const actualSerializer = await vi.importActual<
    typeof bchRecovery_TransactionSerializer
  >('../../src/transaction/transactionSerializer');
  vi.spyOn(bchRecovery_TransactionSerializer, 'fromJson').mockImplementation(
    actualSerializer.fromJson,
  );
  return {
    chain,
    network,
    unsigned,
    signed,
    eventId,
    action: bchRecovery_DatabaseAction.getInstance(),
    rpcCalls,
    rpcErrors,
    forbiddenSign,
  };
};
