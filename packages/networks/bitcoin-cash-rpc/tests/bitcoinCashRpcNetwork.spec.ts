import {
  binToHex,
  decodeTransactionBCH,
  encodeTransactionBCH,
  hashTransaction,
} from '@bitauth/libauth';

import { BitcoinCashRpcNetwork, BitcoinCashRpcError } from '../lib';
import { block } from './bitcoinCashRpcTestData';
import {
  address,
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
} from './bitcoinCashRpcTestUtils';

const config = {
  url: 'http://127.0.0.1:18443',
  expectedChain: 'regtest' as const,
};
/**
 * Connect a provider to deterministic replies and optional work limits.
 * @param options - Fixture replacements or response mutations; defaults to ordinary replies
 * @param limits - Provider limit overrides; defaults to the provider's bounded defaults
 * @returns Provider, injected transport, recorded calls and parent transaction hash
 */
const setup = (options: Parameters<typeof fixture>[0] = {}, limits = {}) => {
  const f = fixture(options);
  return {
    ...f,
    network: new BitcoinCashRpcNetwork({ ...config, ...limits }, f.transport),
  };
};
describe('BitcoinCashRpcNetwork', () => {
  describe('constructor', () => {
    /**
     * @target BitcoinCashRpcNetwork.constructor enforces endpoint policy without
     * an injected transport
     * @dependencies Actual network and transport; no injected RPC implementation
     * @scenario Configure remote HTTP, then HTTPS or literal loopback HTTP
     * @expected Reject remote plaintext and accept TLS and literal loopback
     */
    it('enforces endpoint policy without an injected transport', () => {
      expect(
        () =>
          new BitcoinCashRpcNetwork({
            ...config,
            url: 'http://rpc.example.test',
          }),
      ).toThrow('HTTPS outside literal loopback');
      expect(
        () =>
          new BitcoinCashRpcNetwork({
            ...config,
            url: 'https://rpc.example.test',
          }),
      ).not.toThrow();
      expect(() => new BitcoinCashRpcNetwork(config)).not.toThrow();
    });
  });
  describe('getAddressBoxes', () => {
    /**
     * @target BitcoinCashRpcNetwork.getAddressBoxes - authenticates wallet
     * parents and translates mainnet payload to regtest
     * @dependencies setup with ordinary parent bytes and confirmed current
     * output
     * @scenario Request an imported mainnet address from the regtest provider.
     * @expected Return one exact 100000-satoshi native output and send the
     * translated bchreg address to RPC.
     */
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
      expect(
        calls.find((c) => c.method === 'getaddressinfo')?.params[0],
      ).toMatch(/^bchreg:/);
      expect(calls.find((c) => c.method === 'gettxout')?.params).toEqual([
        parentId,
        0,
        true,
      ]);
    });
    /**
     * @target BitcoinCashRpcNetwork.getAddressBoxes - rejects isolated %s
     * fault
     * @dependencies fixture mutate seam, with one fault per vector
     * @scenario Fault chain, node, wallet import, parent hash/value/script,
     * current value/script/confirmations/coinbase, wallet confirmations or
     * token metadata.
     * @expected Reject each isolated mismatch rather than returning spendable
     * outputs.
     */
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
        /** Provide the mutate test seam for the current scenario without external requests. */
        mutate: (method, value) =>
          method === target ? fault(value as Record<string, unknown>) : value,
      });
      await expect(network.getAddressBoxes(address, 0, 10)).rejects.toThrow();
    });
    /**
     * @target BitcoinCashRpcNetwork.getAddressBoxes - rejects raw token
     * parents even with tokenData omitted
     * @dependencies parentBytes(false, true)
     * @scenario Return canonical parent bytes carrying a CashToken without
     * verbose token metadata.
     * @expected Reject the token-bearing parent with a CashTokens error.
     */
    it('rejects raw token parents even with tokenData omitted', async () => {
      const { network } = setup({ parent: parentBytes(false, true) });
      await expect(network.getAddressBoxes(address, 0, 10)).rejects.toThrow(
        'CashTokens',
      );
    });

    describe('work limits', () => {
      /**
       * @target BitcoinCashRpcNetwork.getAddressBoxes - enforces pagination
       * and wallet work limits
       * @dependencies setup and a one-UTXO configured work limit
       * @scenario Request an empty tail page, a negative offset and an
       * oversized
       * wallet result.
       * @expected Return the empty tail and reject invalid offset and RPC
       * cardinality overflow.
       */
      it('enforces pagination and wallet work limits', async () => {
        const { network } = setup();
        expect(await network.getAddressBoxes(address, 1, 1)).toEqual([]);
        await expect(network.getAddressBoxes(address, -1, 1)).rejects.toThrow();
        const bounded = setup(
          {
            /** Provide the mutate test seam for the current scenario without external requests. */
            mutate: (m, v) => (m === 'listunspent' ? [v, v] : v),
          },
          { maxUtxos: 1 },
        );
        await expect(
          bounded.network.getAddressBoxes(address, 0, 1),
        ).rejects.toThrow('cardinality');
      });
    });
    describe('input network prefix', () => {
      /**
       * @target BitcoinCashRpcNetwork.getAddressBoxes - rejects alternate
       * network CashAddr input at the dedicated codec boundary
       * @dependencies ordinary setup and a bchreg-prefix input mutation
       * @scenario Supply alternate-network CashAddr directly to the dedicated
       * input codec.
       * @expected Reject the address before returning outputs.
       */
      it('rejects alternate network CashAddr input at the dedicated codec boundary', async () => {
        const { network } = setup();
        await expect(
          network.getAddressBoxes(
            address.replace('bitcoincash:', 'bchreg:'),
            0,
            1,
          ),
        ).rejects.toThrow();
      });
    });
  });
  describe('getUtxo', () => {
    /**
     * @target BitcoinCashRpcNetwork.getUtxo - preserves historical spent
     * parents but excludes spent current outputs
     * @dependencies setup with gettxout returning null
     * @scenario Resolve the retained parent and query the spent current output
     * and address list.
     * @expected Preserve the historical prevout, return undefined for getUtxo
     * and an empty address list.
     */
    it('preserves historical spent parents but excludes spent current outputs', async () => {
      const { network } = setup({ current: null });
      expect(await network.getPrevout(`${parentId}.0`)).toMatchObject({
        value: 100000n,
      });
      expect(await network.getUtxo(`${parentId}.0`)).toBeUndefined();
      expect(await network.getAddressBoxes(address, 0, 10)).toEqual([]);
    });
    /**
     * @target BitcoinCashRpcNetwork.getUtxo - excludes immature coinbase and
     * accepts maturity at 100
     * @dependencies parentBytes(true) and a current-confirmation mutation
     * @scenario Query the coinbase output below maturity and again at exactly
     * 100 confirmations.
     * @expected Exclude the immature output and retain coinbase=true at
     * maturity.
     */
    it('excludes immature coinbase and accepts maturity at 100', async () => {
      const raw = parentBytes(true);
      const immature = setup({ parent: raw });
      expect(
        await immature.network.getUtxo(`${immature.id}.0`),
      ).toBeUndefined();
      const mature = setup({
        parent: raw,
        /** Provide the mutate test seam for the current scenario without external requests. */
        mutate: (method, value) =>
          method === 'gettxout'
            ? { ...(value as object), confirmations: 100 }
            : value,
      });
      expect(
        (await mature.network.getUtxo(`${mature.id}.0`))?.coinbase,
      ).toEqual(true);
    });
  });

  describe('getTransaction', () => {
    /**
     * @target BitcoinCashRpcNetwork.getTransaction - authenticates
     * block-qualified transaction membership and confirmations
     * @dependencies setup with signedId and block fixtures
     * @scenario Fetch the signed transaction from its required block.
     * @expected Return signedId and request raw bytes with the specified block
     * argument.
     */
    it('authenticates block-qualified transaction membership and confirmations', async () => {
      const { network, calls } = setup();
      expect((await network.getTransaction(signedId, block)).txid).toEqual(
        signedId,
      );
      expect(
        calls.some(
          (c) => c.method === 'getrawtransaction' && c.params[2] === block,
        ),
      ).toEqual(true);
    });
    /**
     * @target BitcoinCashRpcNetwork.getTransaction - rejects isolated %s block
     * fault
     * @dependencies fixture mutations for
     * getblockhash/getblock/getrawtransaction/getblockheader
     * @scenario Individually fault chain membership, transaction membership,
     * raw block identity or block confirmations.
     * @expected Reject each inconsistent block-qualified transaction.
     */
    it.each([
      'getblockhash',
      'getblock',
      'getrawtransaction',
      'getblockheader',
    ])('rejects isolated %s block fault', async (target) => {
      const { network } = setup({
        /** Provide the mutate test seam for the current scenario without external requests. */
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
    });
  });
  describe('getTxConfirmation', () => {
    /**
     * @target BitcoinCashRpcNetwork.getTxConfirmation - returns -1 only on a
     * true transaction notfound
     * @dependencies setup with BitcoinCashRpcError(-5) and a current
     * synchronized index
     * @scenario Return -5 from raw and wallet lookups, then separately from a
     * confirmed header lookup.
     * @expected Return -1 for validated indexed absence and propagate the
     * header failure.
     */
    it('returns -1 only on a true transaction notfound', async () => {
      const { network } = setup({
        /** Provide the mutate test seam for the current scenario without external requests. */
        mutate: (m, v) => {
          if (['getrawtransaction', 'gettransaction'].includes(m))
            throw new BitcoinCashRpcError(-5);
          return v;
        },
      });
      expect(await network.getTxConfirmation(signedId)).toEqual(-1);
      const broken = setup({
        /** Provide the mutate test seam for the current scenario without external requests. */
        mutate: (m, v) => {
          if (m === 'getblockheader') throw new BitcoinCashRpcError(-5);
          return m === 'getrawtransaction' ? metadata(signed, true) : v;
        },
      });
      await expect(
        broken.network.getTxConfirmation(signedId),
      ).rejects.toThrow();
    });
    /**
     * @target BitcoinCashRpcNetwork.getTxConfirmation - rejects unsigned ID
     * and negative reorg confirmations
     * @dependencies unsigned bytes and a negative-confirmation mutation
     * @scenario Query an unsigned approval ID or a raw response with negative
     * confirmations.
     * @expected Reject both instead of reporting a usable signed confirmation
     * count.
     */
    it('rejects unsigned ID and negative reorg confirmations', async () => {
      const unsignedId = hashTransaction(unsigned);
      const a = setup({
        /** Provide the mutate test seam for the current scenario without external requests. */
        mutate: (m, v) => (m === 'getrawtransaction' ? metadata(unsigned) : v),
      });
      await expect(a.network.getTxConfirmation(unsignedId)).rejects.toThrow(
        'Unsigned',
      );
      const b = setup({
        /** Provide the mutate test seam for the current scenario without external requests. */
        mutate: (m, v) =>
          m === 'getrawtransaction'
            ? { ...(v as object), confirmations: -1 }
            : v,
      });
      await expect(b.network.getTxConfirmation(signedId)).rejects.toThrow();
    });
    /**
     * @target BitcoinCashRpcNetwork.getTxConfirmation - does not turn %s index
     * into global transaction absence
     * @dependencies raw/wallet -5 replies and missing, lagging or unsynced
     * txindex vectors
     * @scenario Attempt to establish global absence without a current
     * synchronized index.
     * @expected Reject with absence unavailable for every index vector.
     */
    it.each([
      ['missing', {}],
      ['lagging', { txindex: { synced: true, best_block_height: 99 } }],
      ['unsynced', { txindex: { synced: false, best_block_height: 100 } }],
    ])(
      'does not turn %s index into global transaction absence',
      async (_name, index) => {
        const { network } = setup({
          /** Provide the mutate test seam for the current scenario without external requests. */
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
  });
  describe('isTxInMempool', () => {
    /**
     * @target BitcoinCashRpcNetwork.isTxInMempool - uses actual signed IDs in
     * bounded mempool
     * @dependencies setup with signedId and an oversized mempool mutation
     * @scenario Query signedId and approval ID, then exceed a one-entry
     * mempool limit.
     * @expected Return true only for signedId and reject the oversized mempool
     * list.
     */
    it('uses actual signed IDs in bounded mempool', async () => {
      const { network } = setup();
      expect(await network.isTxInMempool(signedId)).toEqual(true);
      expect(await network.isTxInMempool(envelope.txId)).toEqual(false);
      const bounded = setup(
        {
          /** Provide the mutate test seam for the current scenario without external requests. */
          mutate: (m, v) => (m === 'getrawmempool' ? [signedId, signedId] : v),
        },
        { maxMempoolTransactions: 1 },
      );
      await expect(bounded.network.isTxInMempool(signedId)).rejects.toThrow();
    });
  });
  describe('submitTransaction', () => {
    /**
     * @target BitcoinCashRpcNetwork.submitTransaction - verifies signed
     * envelope and all current prevouts before submitting exact signed ID
     * @dependencies signedEnvelope, signed bytes and recorded fixture calls
     * @scenario Submit the validated signed envelope against its current
     * native input.
     * @expected End with sendrawtransaction carrying the exact signed
     * hexadecimal bytes.
     */
    it('verifies signed envelope and all current prevouts before submitting exact signed ID', async () => {
      const { network, calls } = setup();
      await network.submitTransaction(signedEnvelope);
      expect(calls.at(-1)).toEqual({
        method: 'sendrawtransaction',
        params: [binToHex(signed)],
      });
    });
    /**
     * @target BitcoinCashRpcNetwork.submitTransaction - rejects unsigned,
     * spent, refused and wrong returned ID submissions
     * @dependencies unsigned/signed envelopes and isolated
     * current/error/returned-ID mutations
     * @scenario Attempt unsigned, spent-input, RPC-rejected and
     * approval-ID-returning submissions.
     * @expected Reject every case; the unsigned case makes no RPC call.
     */
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
        /** Provide the mutate test seam for the current scenario without external requests. */
        mutate: (m, v) => {
          if (m === 'sendrawtransaction') throw new BitcoinCashRpcError(-26);
          return v;
        },
      });
      await expect(c.network.submitTransaction(signedEnvelope)).rejects.toThrow(
        '-26',
      );
      const d = setup({
        /** Provide the mutate test seam for the current scenario without external requests. */
        mutate: (m, v) => (m === 'sendrawtransaction' ? envelope.txId : v),
      });
      await expect(d.network.submitTransaction(signedEnvelope)).rejects.toThrow(
        'ID mismatch',
      );
    });
  });
  describe('findSignedTransaction', () => {
    /**
     * @target BitcoinCashRpcNetwork.findSignedTransaction - recovers signed
     * bytes from bounded watch-only wallet history and deduplicates IDs
     * @dependencies setup with duplicate signedId history rows
     * @scenario Search for the signed form of the approved unsigned body.
     * @expected Return exact signed bytes and request the bounded
     * watch-only-inclusive history page.
     */
    it('recovers signed bytes from bounded watch-only wallet history and deduplicates IDs', async () => {
      const { network, calls } = setup({
        history: [
          { txid: signedId, confirmations: 0 },
          { txid: signedId, confirmations: 0 },
        ],
      });
      expect(
        binToHex((await network.findSignedTransaction(unsigned))!),
      ).toEqual(binToHex(signed));
      expect(
        calls.find((c) => c.method === 'listtransactions')?.params,
      ).toEqual(['*', 100, 0, true]);
    });
    /**
     * @target BitcoinCashRpcNetwork.findSignedTransaction - recovery rejects
     * full-body %s mismatch
     * @dependencies libauth decode/encode and altered wallet bytes
     * @scenario Individually change version, locktime, output value, sequence,
     * input list or output list.
     * @expected Return undefined after scanning each nonmatching candidate
     * body.
     */
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
        /** Provide the mutate test seam for the current scenario without external requests. */
        mutate: (m, v) =>
          m === 'gettransaction'
            ? { ...metadata(altered), confirmations: 0 }
            : v,
      });
      expect(await network.findSignedTransaction(unsigned)).toBeUndefined();
    });
    /**
     * @target BitcoinCashRpcNetwork.findSignedTransaction - recovery skips
     * unsigned candidates, throws exhausted bounds and changing history
     * @dependencies unsigned wallet candidate, one-page history limit and
     * changing wallet count
     * @scenario Search unsigned bytes, exhaust a full bounded page and mutate
     * history during an empty scan.
     * @expected Skip unsigned bytes, reject exhausted work and reject changing
     * history.
     */
    it('recovery skips unsigned candidates, throws exhausted bounds and changing history', async () => {
      const id = hashTransaction(unsigned);
      const a = setup({
        history: [{ txid: id, confirmations: 0 }],
        /** Provide the mutate test seam for the current scenario without external requests. */
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
        /** Provide the mutate test seam for the current scenario without external requests. */
        mutate: (m, v) => (m === 'getwalletinfo' ? { txcount: count++ } : v),
      });
      await expect(c.network.findSignedTransaction(unsigned)).rejects.toThrow(
        'changed',
      );
    });
    /**
     * @target BitcoinCashRpcNetwork.findSignedTransaction - recovery rejects
     * reordered %s without cardinality change
     * @dependencies two-input/two-output approved and signed libauth fixtures
     * @scenario Reverse candidate inputs or outputs while preserving their
     * counts.
     * @expected Return undefined for both ordered-body mismatches.
     */
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
          /** Provide the mutate test seam for the current scenario without external requests. */
          mutate: (m, v) =>
            m === 'gettransaction'
              ? { ...metadata(bytes), confirmations: 0 }
              : v,
        });
        expect(
          await network.findSignedTransaction(encodeTransactionBCH(approved)),
        ).toBeUndefined();
      },
    );

    describe('malformed bytes', () => {
      /**
       * @target BitcoinCashRpcNetwork.findSignedTransaction - rejects
       * malformed recovery raw bytes instead of establishing absence
       * @dependencies wallet gettransaction mutation returning hex 00
       * @scenario Search history containing malformed raw bytes.
       * @expected Reject decoding rather than returning undefined as
       * established
       * absence.
       */
      it('rejects malformed recovery raw bytes instead of establishing absence', async () => {
        const { network } = setup({
          /** Provide the mutate test seam for the current scenario without external requests. */
          mutate: (m, v) =>
            m === 'gettransaction' ? { ...(v as object), hex: '00' } : v,
        });
        await expect(network.findSignedTransaction(unsigned)).rejects.toThrow();
      });
    });
    describe('historical wallet state', () => {
      /**
       * @target BitcoinCashRpcNetwork.findSignedTransaction - scans unrelated
       * old wallet rows without block or global raw lookup
       * @dependencies unrelated abandoned/conflicted parent row followed by
       * signedId
       * @scenario Scan old unrelated wallet bytes while making block/global
       * raw
       * lookups fail if attempted.
       * @expected Return exact matching signed bytes using wallet lookups
       * only.
       */
      it('scans unrelated old wallet rows without block or global raw lookup', async () => {
        const { network, calls } = setup({
          history: [
            { txid: parentId, confirmations: -1, blockhash: 'ff'.repeat(32) },
            { txid: signedId, confirmations: 0 },
          ],
          /** Provide the mutate test seam for the current scenario without external requests. */
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
        expect(
          binToHex((await network.findSignedTransaction(unsigned))!),
        ).toEqual(binToHex(signed));
        expect(
          calls
            .filter((c) => c.method === 'gettransaction')
            .map((c) => c.params),
        ).toEqual([
          [parentId, true],
          [signedId, true],
        ]);
        expect(calls.some((c) => c.method === 'getrawtransaction')).toEqual(
          false,
        );
      });
      /**
       * @target BitcoinCashRpcNetwork.findSignedTransaction - returns absence
       * after scanning an authenticated irrelevant wallet body with no block
       * hash
       * @dependencies history containing an unrelated parent body and negative
       * confirmations
       * @scenario Complete a short wallet page whose validated body differs
       * from
       * the approval.
       * @expected Return undefined without requiring an irrelevant historical
       * block hash.
       */
      it('returns absence after scanning an authenticated irrelevant wallet body with no block hash', async () => {
        const { network } = setup({
          history: [{ txid: parentId, confirmations: -1 }],
        });
        expect(await network.findSignedTransaction(unsigned)).toBeUndefined();
      });
      /**
       * @target BitcoinCashRpcNetwork.findSignedTransaction - stops on a
       * matching %s wallet transaction
       * @dependencies matching signed wallet bytes with conflicted or
       * abandoned
       * state vectors
       * @scenario Find the approved body in an unusable wallet transaction
       * state.
       * @expected Reject with abandoned or conflicted rather than establish
       * usable recovery or absence.
       */
      it.each(['conflicted', 'abandoned'])(
        'stops on a matching %s wallet transaction',
        async (state) => {
          const { network } = setup({
            /** Provide the mutate test seam for the current scenario without external requests. */
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
      /**
       * @target BitcoinCashRpcNetwork.findSignedTransaction - rejects wallet
       * recovery identity mismatch before comparing an irrelevant body
       * @dependencies unrelated parent history row with a forged wallet txid
       * @scenario Fetch candidate bytes whose wallet identity differs from the
       * requested row.
       * @expected Reject the identity mismatch before comparing transaction
       * bodies.
       */
      it('rejects wallet recovery identity mismatch before comparing an irrelevant body', async () => {
        const { network } = setup({
          history: [{ txid: parentId, confirmations: 0 }],
          /** Provide the mutate test seam for the current scenario without external requests. */
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
  });
  describe('getTokenDetail', () => {
    /**
     * @target BitcoinCashRpcNetwork.getTokenDetail - supports only the native
     * BCH token detail
     * @dependencies ordinary setup
     * @scenario Query native bch metadata and then a foreign token identifier.
     * @expected Return BitcoinCash with eight decimals and reject foreign
     * token metadata.
     */
    it('supports only the native BCH token detail', async () => {
      const { network } = setup();
      expect(await network.getTokenDetail('bch')).toEqual({
        tokenId: 'bch',
        name: 'BitcoinCash',
        decimals: 8,
      });
      await expect(network.getTokenDetail('token')).rejects.toThrow('tokens');
    });
  });
  describe('getPrevout', () => {
    /**
     * @target BitcoinCashRpcNetwork.getPrevout - rejects canonical raw bytes
     * carrying a different parent hash
     * @dependencies parentBytes(true) substituted into ordinary verbose
     * metadata
     * @scenario Keep the requested parent hash while replacing its canonical
     * raw bytes.
     * @expected Reject the raw transaction identity mismatch.
     */
    it('rejects canonical raw bytes carrying a different parent hash', async () => {
      const { network } = setup({
        /** Provide the mutate test seam for the current scenario without external requests. */
        mutate: (m, v) =>
          m === 'getrawtransaction'
            ? { ...(v as object), hex: binToHex(parentBytes(true)) }
            : v,
      });
      await expect(network.getPrevout(`${parentId}.0`)).rejects.toThrow(
        'identity',
      );
    });
  });
});
