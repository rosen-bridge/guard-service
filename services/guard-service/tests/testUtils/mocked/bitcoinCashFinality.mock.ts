import * as wasm from 'ergo-lib-wasm-nodejs';
import { readFileSync } from 'node:fs';

import { decodeAddress, validateAddress } from '@rosen-bridge/address-codec';
import { AddressManager } from '@rosen-bridge/address-manager';
import { ChainMinimumFee } from '@rosen-bridge/minimum-fee';
import { EventTrigger } from '@rosen-chains/abstract-chain';
import { BitcoinCashChain } from '@rosen-chains/bitcoin-cash';
import { BitcoinCashRpcNetwork } from '@rosen-chains/bitcoin-cash-rpc';
import { ErgoChain } from '@rosen-chains/ergo';

import GuardsErgoConfigs from '../../../src/configs/guardsErgoConfigs';
import EventBoxes from '../../../src/event/eventBoxes';
import ChainHandler from '../../../src/handlers/chainHandler';
import MinimumFeeHandler from '../../../src/handlers/minimumFeeHandler';
import { bchPublicKey, ergoAddress } from '../../configs/bitcoinCashTestData';
import { bchLock, bchTokenMap } from '../../configs/bitcoinCashTestUtils';
import DatabaseActionMock from '../../db/mocked/databaseAction.mock';
import { preserveBitcoinCashMocks } from './bitcoinCashMockScope.mock';

const fixture = JSON.parse(
  readFileSync(
    new URL(
      '../../integration/testData/bitcoinCashFinality.json',
      import.meta.url,
    ),
    'utf8',
  ),
) as {
  chainInfo: {
    chain: string;
    blocks: number;
    headers: number;
    initialblockdownload: boolean;
    bestblockhash: string;
  };
  sourceBlock: {
    hash: string;
    height: number;
    confirmations: number;
    time: number;
    previousblockhash: string;
  };
  deposit: { txid: string; vin: { txid: string; vout: number }[] };
};

/**
 * Connect real BCH RPC/chain and Guard event processing to deterministic data.
 * Only the RPC transport, registry, Ergo height and fee/box lookup are replaced.
 * The actual extractor, RWT validation and migrated SQLite repositories remain.
 * @param requiredConfirmations - Guard observation depth, independent of node finalization
 * @returns Mutable RPC state and teardown for only this fixture's seams
 */
export const setupBitcoinCashFinality = async (requiredConfirmations = 6) => {
  const restore = preserveBitcoinCashMocks([
    [ChainHandler, ['getInstance']],
    [EventBoxes, ['getEventBox']],
    [MinimumFeeHandler, ['getEventFeeConfig']],
  ]);
  const state = {
    confirmations: fixture.sourceBlock.confirmations,
    branchMatches: true,
    branchMismatchAfterReads: 0,
  };
  let branchReads = 0;
  const calls: string[] = [];
  const network = new BitcoinCashRpcNetwork(
    { url: 'http://127.0.0.1:18443', expectedChain: 'regtest' },
    {
      /**
       * Return only the deterministic RPC responses needed by the source deposit.
       * @param method - Requested BCHN method
       * @param params - Positional RPC arguments, checked where they bind identity
       * @returns The fixture's current branch and confirmation evidence
       */
      call: async (method, params) => {
        calls.push(method);
        const block = {
          ...fixture.sourceBlock,
          confirmations: state.confirmations,
        };
        switch (method) {
          case 'getnetworkinfo':
            return { subversion: '/Bitcoin Cash Node:29.2.0/' };
          case 'getblockchaininfo':
            return {
              ...fixture.chainInfo,
              blocks: block.height + state.confirmations - 1,
              headers: block.height + state.confirmations - 1,
              bestblockhash:
                state.confirmations === fixture.sourceBlock.confirmations
                  ? fixture.chainInfo.bestblockhash
                  : '91'.repeat(32),
            };
          case 'getrawtransaction':
            if (
              params[0] !== fixture.deposit.txid ||
              (params[2] !== undefined && params[2] !== block.hash)
            )
              throw Error('Unexpected source transaction request');
            return {
              ...fixture.deposit,
              blockhash: block.hash,
              confirmations: state.confirmations,
              blocktime: block.time,
            };
          case 'getblockheader':
            if (params[0] !== block.hash)
              throw Error('Unexpected source header request');
            return block;
          case 'getblockhash':
            if (params[0] !== block.height)
              throw Error('Unexpected source height request');
            branchReads++;
            return state.branchMatches ||
              branchReads <= state.branchMismatchAfterReads
              ? block.hash
              : '77'.repeat(32);
          case 'getblock':
            if (params[0] !== block.hash)
              throw Error('Unexpected source block request');
            return { ...block, tx: [fixture.deposit.txid] };
          default:
            throw Error(`Unexpected BCH RPC method: ${method}`);
        }
      },
    },
  );
  AddressManager.init(
    { ergo: (address) => validateAddress('ergo', address) },
    { ergo: (address) => decodeAddress('ergo', address) },
  );
  const tokens = await bchTokenMap();
  const chain = new BitcoinCashChain(
    network,
    {
      aggregatedPublicKey: bchPublicKey,
      feeRate: 1,
      maxFee: 10000n,
      minimumUtxoValue: 546n,
      maxUtxoPages: 2,
      fee: 1n,
      confirmations: {
        observation: requiredConfirmations,
        payment: 1,
        cold: 1,
        manual: 1,
        arbitrary: 1,
      },
      addresses: {
        lock: bchLock,
        cold: bchLock,
        permit: ergoAddress,
        fraud: ergoAddress,
      },
      rwtId: '12'.repeat(32),
    },
    tokens,
    {} as ConstructorParameters<typeof BitcoinCashChain>[3],
  );
  const ergo = new ErgoChain(
    {} as ConstructorParameters<typeof ErgoChain>[0],
    {
      addresses: { lock: ergoAddress },
      fee: 1000000n,
    } as ConstructorParameters<typeof ErgoChain>[1],
    tokens,
    {} as ConstructorParameters<typeof ErgoChain>[3],
  );
  vi.spyOn(ergo, 'getHeight').mockResolvedValue(
    300 + GuardsErgoConfigs.eventConfirmation,
  );
  vi.spyOn(ChainHandler, 'getInstance').mockReturnValue({
    /** Resolve only the BCH source required by the fixture. */
    getChain: (name: string) => {
      if (name !== 'bitcoin-cash') throw Error('Unexpected source chain');
      return chain;
    },
    /** Retain actual Ergo RWT verification with only height fixed. */
    getErgoChain: () => ergo,
  } as unknown as ChainHandler);
  const serialized = Buffer.from(
    wasm.ErgoBox.from_json(
      JSON.stringify({
        value: '1000000',
        ergoTree: wasm.Address.from_base58(ergoAddress)
          .to_ergo_tree()
          .to_base16_bytes(),
        creationHeight: 100,
        assets: [{ tokenId: '12'.repeat(32), amount: '1' }],
        additionalRegisters: {},
        transactionId: '55'.repeat(32),
        index: 0,
      }),
    ).sigma_serialize_bytes(),
  ).toString('hex');
  vi.spyOn(EventBoxes, 'getEventBox').mockResolvedValue(serialized);
  vi.spyOn(MinimumFeeHandler, 'getEventFeeConfig').mockReturnValue(
    new ChainMinimumFee({
      bridgeFee: 10n,
      networkFee: 20n,
      feeRatio: 0n,
      rsnRatio: 0n,
      rsnRatioDivisor: 100n,
    }),
  );
  const event: EventTrigger = {
    height: 300,
    fromChain: 'bitcoin-cash',
    toChain: 'ergo',
    fromAddress: `box:${fixture.deposit.vin[0].txid}.7`,
    toAddress: ergoAddress,
    amount: '123456789',
    bridgeFee: '291',
    networkFee: '1110',
    sourceChainTokenId: 'bch',
    targetChainTokenId: '56'.repeat(32),
    sourceTxId: fixture.deposit.txid,
    sourceChainHeight: fixture.sourceBlock.height,
    sourceBlockId: fixture.sourceBlock.hash,
    WIDsHash: '66'.repeat(32),
    WIDsCount: 1,
  };
  await DatabaseActionMock.insertOnlyEventDataRecord(event, serialized);
  return { state, calls, event, restore };
};
