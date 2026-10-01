import {
  binToHex,
  decodeTransactionBCH,
  encodeTransactionBCH,
  hashTransaction,
} from '@bitauth/libauth';

import { BitcoinCashRpcNetwork, BitcoinCashRpcError } from '../lib';
import {
  address,
  block,
  envelope,
  fixture,
  metadata,
  parentBytes,
  parentId,
  script,
  signed,
  signedEnvelope,
  signedId,
  unsigned,
} from './fixtures';

const config = {
  url: 'http://127.0.0.1:18443',
  expectedChain: 'regtest' as const,
};
const setup = (options: Parameters<typeof fixture>[0] = {}, limits = {}) => {
  const f = fixture(options);
  return {
    ...f,
    network: new BitcoinCashRpcNetwork({ ...config, ...limits }, f.transport),
  };
};
describe('bounded native BCHN RPC network', () => {
  it('authenticates wallet parents and translates mainnet payload to regtest', async () => {
    const { network, calls } = setup();
    const boxes = await network.getAddressBoxes(address, 0, 10);
    expect(boxes).toHaveLength(1);
    expect(boxes[0]).toMatchObject({
      txId: parentId,
      value: 100000n,
      scriptPubKey: script,
      confirmations: 6,
      coinbase: false,
    });
    expect(calls.find((c) => c.method === 'getaddressinfo')?.params[0]).toMatch(
      /^bchreg:/,
    );
    expect(calls.find((c) => c.method === 'gettxout')?.params).toEqual([
      parentId,
      0,
      true,
    ]);
  });
  it.each([
    [
      'chain',
      'getblockchaininfo',
      (v: Record<string, unknown>) => ({ ...v, chain: 'main' }),
    ],
    ['node', 'getnetworkinfo', () => ({ subversion: '/Satoshi:29.1.0/' })],
    [
      'wallet import',
      'getaddressinfo',
      (v: Record<string, unknown>) => ({ ...v, iswatchonly: false }),
    ],
    [
      'parent hash',
      'getrawtransaction',
      (v: Record<string, unknown>) => ({ ...v, txid: 'ff'.repeat(32) }),
    ],
    [
      'parent value',
      'getrawtransaction',
      (v: Record<string, unknown>) => ({
        ...v,
        vout: [{ n: 0, value: '0.002', scriptPubKey: { hex: script } }],
      }),
    ],
    [
      'parent script',
      'getrawtransaction',
      (v: Record<string, unknown>) => ({
        ...v,
        vout: [{ n: 0, value: '0.001', scriptPubKey: { hex: '51' } }],
      }),
    ],
    [
      'current value',
      'gettxout',
      (v: Record<string, unknown>) => ({ ...v, value: '0.002' }),
    ],
    [
      'current script',
      'gettxout',
      (v: Record<string, unknown>) => ({ ...v, scriptPubKey: { hex: '51' } }),
    ],
    [
      'current confirmations',
      'gettxout',
      (v: Record<string, unknown>) => ({ ...v, confirmations: -1 }),
    ],
    [
      'current coinbase',
      'gettxout',
      (v: Record<string, unknown>) => ({ ...v, coinbase: true }),
    ],
    [
      'wallet confirmations',
      'listunspent',
      () => [
        {
          txid: parentId,
          vout: 0,
          amount: '0.001',
          scriptPubKey: script,
          confirmations: 5,
        },
      ],
    ],
    [
      'token claim',
      'gettxout',
      (v: Record<string, unknown>) => ({
        ...v,
        tokenData: { category: 'ff'.repeat(32), amount: '1' },
      }),
    ],
  ])('rejects isolated %s fault', async (_name, target, fault) => {
    const { network } = setup({
      mutate: (method, value) =>
        method === target ? fault(value as Record<string, unknown>) : value,
    });
    await expect(network.getAddressBoxes(address, 0, 10)).rejects.toThrow();
  });
  it('rejects raw token parents even with tokenData omitted', async () => {
    const { network } = setup({ parent: parentBytes(false, true) });
    await expect(network.getAddressBoxes(address, 0, 10)).rejects.toThrow(
      'CashTokens',
    );
  });
  it('preserves historical spent parents but excludes spent current outputs', async () => {
    const { network } = setup({ current: null });
    expect(await network.getPrevout(`${parentId}.0`)).toMatchObject({
      value: 100000n,
    });
    expect(await network.getUtxo(`${parentId}.0`)).toBeUndefined();
    expect(await network.getAddressBoxes(address, 0, 10)).toEqual([]);
  });
  it('excludes immature coinbase and accepts maturity at 100', async () => {
    const raw = parentBytes(true);
    const immature = setup({ parent: raw });
    expect(await immature.network.getUtxo(`${immature.id}.0`)).toBeUndefined();
    const mature = setup({
      parent: raw,
      mutate: (method, value) =>
        method === 'gettxout'
          ? { ...(value as object), confirmations: 100 }
          : value,
    });
    expect((await mature.network.getUtxo(`${mature.id}.0`))?.coinbase).toBe(
      true,
    );
  });
  it('enforces pagination and wallet work limits', async () => {
    const { network } = setup();
    expect(await network.getAddressBoxes(address, 1, 1)).toEqual([]);
    await expect(network.getAddressBoxes(address, -1, 1)).rejects.toThrow();
    const bounded = setup(
      { mutate: (m, v) => (m === 'listunspent' ? [v, v] : v) },
      { maxUtxos: 1 },
    );
    await expect(
      bounded.network.getAddressBoxes(address, 0, 1),
    ).rejects.toThrow('cardinality');
  });
  it('authenticates block-qualified transaction membership and confirmations', async () => {
    const { network, calls } = setup();
    expect((await network.getTransaction(signedId, block)).txid).toBe(signedId);
    expect(
      calls.some(
        (c) => c.method === 'getrawtransaction' && c.params[2] === block,
      ),
    ).toBe(true);
  });
  it.each(['getblockhash', 'getblock', 'getrawtransaction', 'getblockheader'])(
    'rejects isolated %s block fault',
    async (target) => {
      const { network } = setup({
        mutate: (m, v) =>
          m !== target
            ? v
            : target === 'getblockhash'
              ? 'ee'.repeat(32)
              : {
                  ...(v as object),
                  ...(target === 'getblock'
                    ? { tx: [] }
                    : target === 'getrawtransaction'
                      ? { blockhash: 'ee'.repeat(32) }
                      : { confirmations: -1 }),
                },
      });
      await expect(network.getTransaction(signedId, block)).rejects.toThrow();
    },
  );
  it('returns -1 only on a true transaction notfound', async () => {
    const { network } = setup({
      mutate: (m, v) => {
        if (['getrawtransaction', 'gettransaction'].includes(m))
          throw new BitcoinCashRpcError(-5);
        return v;
      },
    });
    expect(await network.getTxConfirmation(signedId)).toBe(-1);
    const broken = setup({
      mutate: (m, v) => {
        if (m === 'getblockheader') throw new BitcoinCashRpcError(-5);
        return m === 'getrawtransaction' ? metadata(signed, true) : v;
      },
    });
    await expect(broken.network.getTxConfirmation(signedId)).rejects.toThrow();
  });
  it('rejects unsigned ID and negative reorg confirmations', async () => {
    const unsignedId = hashTransaction(unsigned);
    const a = setup({
      mutate: (m, v) => (m === 'getrawtransaction' ? metadata(unsigned) : v),
    });
    await expect(a.network.getTxConfirmation(unsignedId)).rejects.toThrow(
      'Unsigned',
    );
    const b = setup({
      mutate: (m, v) =>
        m === 'getrawtransaction' ? { ...(v as object), confirmations: -1 } : v,
    });
    await expect(b.network.getTxConfirmation(signedId)).rejects.toThrow();
  });
  it.each([
    ['missing', {}],
    ['lagging', { txindex: { synced: true, best_block_height: 99 } }],
    ['unsynced', { txindex: { synced: false, best_block_height: 100 } }],
  ])(
    'does not turn %s index into global transaction absence',
    async (_name, index) => {
      const { network } = setup({
        mutate: (m, v) => {
          if (['getrawtransaction', 'gettransaction'].includes(m))
            throw new BitcoinCashRpcError(-5);
          return m === 'getindexinfo' ? index : v;
        },
      });
      await expect(network.getTxConfirmation(signedId)).rejects.toThrow(
        'absence unavailable',
      );
    },
  );
  it('uses actual signed IDs in bounded mempool', async () => {
    const { network } = setup();
    expect(await network.isTxInMempool(signedId)).toBe(true);
    expect(await network.isTxInMempool(envelope.txId)).toBe(false);
    const bounded = setup(
      { mutate: (m, v) => (m === 'getrawmempool' ? [signedId, signedId] : v) },
      { maxMempoolTransactions: 1 },
    );
    await expect(bounded.network.isTxInMempool(signedId)).rejects.toThrow();
  });
  it('verifies signed envelope and all current prevouts before submitting exact signed ID', async () => {
    const { network, calls } = setup();
    await network.submitTransaction(signedEnvelope);
    expect(calls.at(-1)).toEqual({
      method: 'sendrawtransaction',
      params: [binToHex(signed)],
    });
  });
  it('rejects unsigned, spent, refused and wrong returned ID submissions', async () => {
    const a = setup();
    await expect(a.network.submitTransaction(envelope)).rejects.toThrow(
      'unsigned',
    );
    expect(a.calls).toHaveLength(0);
    const b = setup({ current: null });
    await expect(b.network.submitTransaction(signedEnvelope)).rejects.toThrow(
      'spent',
    );
    const c = setup({
      mutate: (m, v) => {
        if (m === 'sendrawtransaction') throw new BitcoinCashRpcError(-26);
        return v;
      },
    });
    await expect(c.network.submitTransaction(signedEnvelope)).rejects.toThrow(
      '-26',
    );
    const d = setup({
      mutate: (m, v) => (m === 'sendrawtransaction' ? envelope.txId : v),
    });
    await expect(d.network.submitTransaction(signedEnvelope)).rejects.toThrow(
      'ID mismatch',
    );
  });
  it('recovers signed bytes from bounded watch-only wallet history and deduplicates IDs', async () => {
    const { network, calls } = setup({
      history: [
        { txid: signedId, confirmations: 0 },
        { txid: signedId, confirmations: 0 },
      ],
    });
    expect(binToHex((await network.findSignedTransaction(unsigned))!)).toBe(
      binToHex(signed),
    );
    expect(calls.find((c) => c.method === 'listtransactions')?.params).toEqual([
      '*',
      100,
      0,
      true,
    ]);
  });
  it.each([
    'version',
    'locktime',
    'outputValue',
    'sequence',
    'inputOrder',
    'outputOrder',
  ])('recovery rejects full-body %s mismatch', async (fault) => {
    const decoded = decodeTransactionBCH(Uint8Array.from(signed));
    if (typeof decoded === 'string') throw Error(decoded);
    if (fault === 'version') decoded.version = 1;
    if (fault === 'locktime') decoded.locktime = 1;
    if (fault === 'outputValue') decoded.outputs[0].valueSatoshis--;
    if (fault === 'sequence') decoded.inputs[0].sequenceNumber--;
    if (fault === 'inputOrder')
      decoded.inputs.push({ ...decoded.inputs[0], outpointIndex: 1 });
    if (fault === 'outputOrder')
      decoded.outputs.unshift({
        lockingBytecode: Uint8Array.of(0x51),
        valueSatoshis: 1n,
      });
    const altered = encodeTransactionBCH(decoded);
    const id = hashTransaction(altered);
    const { network } = setup({
      history: [{ txid: id, confirmations: 0 }],
      mutate: (m, v) =>
        m === 'gettransaction' ? { ...metadata(altered), confirmations: 0 } : v,
    });
    expect(await network.findSignedTransaction(unsigned)).toBeUndefined();
  });
  it('recovery skips unsigned candidates, throws exhausted bounds and changing history', async () => {
    const id = hashTransaction(unsigned);
    const a = setup({
      history: [{ txid: id, confirmations: 0 }],
      mutate: (m, v) =>
        m === 'gettransaction'
          ? { ...metadata(unsigned), confirmations: 0 }
          : v,
    });
    expect(await a.network.findSignedTransaction(unsigned)).toBeUndefined();
    const b = setup(
      { history: [{ txid: parentId, confirmations: 0 }] },
      { walletHistoryPageSize: 1, maxWalletHistoryPages: 1 },
    );
    await expect(b.network.findSignedTransaction(unsigned)).rejects.toThrow(
      'work limit exhausted',
    );
    let count = 0;
    const c = setup({
      history: [],
      mutate: (m, v) => (m === 'getwalletinfo' ? { txcount: count++ } : v),
    });
    await expect(c.network.findSignedTransaction(unsigned)).rejects.toThrow(
      'changed',
    );
  });
  it.each(['input', 'output'])(
    'recovery rejects reordered %s without cardinality change',
    async (field) => {
      const approved = decodeTransactionBCH(Uint8Array.from(unsigned));
      const candidate = decodeTransactionBCH(Uint8Array.from(signed));
      if (typeof approved === 'string' || typeof candidate === 'string')
        throw Error('Fixture decode failure');
      approved.inputs.push({ ...approved.inputs[0], outpointIndex: 1 });
      candidate.inputs.push({ ...candidate.inputs[0], outpointIndex: 1 });
      approved.outputs.push({
        lockingBytecode: Uint8Array.of(0x51),
        valueSatoshis: 1n,
      });
      candidate.outputs.push({
        lockingBytecode: Uint8Array.of(0x51),
        valueSatoshis: 1n,
      });
      if (field === 'input') candidate.inputs.reverse();
      else candidate.outputs.reverse();
      const bytes = encodeTransactionBCH(candidate);
      const id = hashTransaction(bytes);
      const { network } = setup({
        history: [{ txid: id, confirmations: 0 }],
        mutate: (m, v) =>
          m === 'gettransaction' ? { ...metadata(bytes), confirmations: 0 } : v,
      });
      expect(
        await network.findSignedTransaction(encodeTransactionBCH(approved)),
      ).toBeUndefined();
    },
  );
  it('supports only the native BCH token detail', async () => {
    const { network } = setup();
    expect(await network.getTokenDetail('bch')).toEqual({
      tokenId: 'bch',
      name: 'BitcoinCash',
      decimals: 8,
    });
    await expect(network.getTokenDetail('token')).rejects.toThrow('tokens');
  });
  it('rejects canonical raw bytes carrying a different parent hash', async () => {
    const { network } = setup({
      mutate: (m, v) =>
        m === 'getrawtransaction'
          ? { ...(v as object), hex: binToHex(parentBytes(true)) }
          : v,
    });
    await expect(network.getPrevout(`${parentId}.0`)).rejects.toThrow(
      'identity',
    );
  });
  it('rejects malformed recovery raw bytes instead of establishing absence', async () => {
    const { network } = setup({
      mutate: (m, v) =>
        m === 'gettransaction' ? { ...(v as object), hex: '00' } : v,
    });
    await expect(network.findSignedTransaction(unsigned)).rejects.toThrow();
  });
  it('rejects alternate network CashAddr input at the dedicated codec boundary', async () => {
    const { network } = setup();
    await expect(
      network.getAddressBoxes(address.replace('bitcoincash:', 'bchreg:'), 0, 1),
    ).rejects.toThrow();
  });
  it('scans unrelated old wallet rows without block or global raw lookup', async () => {
    const { network, calls } = setup({
      history: [
        { txid: parentId, confirmations: -1, blockhash: 'ff'.repeat(32) },
        { txid: signedId, confirmations: 0 },
      ],
      mutate: (m, v, p) => {
        if (m === 'getrawtransaction' || m === 'getblockheader')
          throw Error('Unrelated historical block must not be fetched');
        if (m === 'gettransaction' && p[0] === parentId)
          return {
            txid: parentId,
            hex: binToHex(parentBytes()),
            confirmations: -1,
            abandoned: true,
          };
        return v;
      },
    });
    expect(binToHex((await network.findSignedTransaction(unsigned))!)).toBe(
      binToHex(signed),
    );
    expect(
      calls.filter((c) => c.method === 'gettransaction').map((c) => c.params),
    ).toEqual([
      [parentId, true],
      [signedId, true],
    ]);
    expect(calls.some((c) => c.method === 'getrawtransaction')).toBe(false);
  });
  it('returns absence after scanning an authenticated irrelevant wallet body with no block hash', async () => {
    const { network } = setup({
      history: [{ txid: parentId, confirmations: -1 }],
    });
    expect(await network.findSignedTransaction(unsigned)).toBeUndefined();
  });
  it.each(['conflicted', 'abandoned'])(
    'stops on a matching %s wallet transaction',
    async (state) => {
      const { network } = setup({
        mutate: (m, v) =>
          m === 'gettransaction'
            ? {
                ...(v as object),
                ...(state === 'conflicted'
                  ? { confirmations: -1 }
                  : { abandoned: true }),
              }
            : v,
      });
      await expect(network.findSignedTransaction(unsigned)).rejects.toThrow(
        'abandoned or conflicted',
      );
    },
  );
  it('rejects wallet recovery identity mismatch before comparing an irrelevant body', async () => {
    const { network } = setup({
      history: [{ txid: parentId, confirmations: 0 }],
      mutate: (m, v) =>
        m === 'gettransaction'
          ? { ...(v as object), txid: 'ff'.repeat(32) }
          : v,
    });
    await expect(network.findSignedTransaction(unsigned)).rejects.toThrow(
      'identity',
    );
  });
});
