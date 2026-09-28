import { EventEmitter } from 'node:events';
import { syncBuiltinESMExports } from 'node:module';
import tls from 'node:tls';

import { AddressManager } from '@rosen-bridge/address-manager';
import { TokenMap } from '@rosen-bridge/tokens';

import GuardsDogeConfigs from '../../src/configs/guardsDogeConfigs';
import GuardsFiroConfigs from '../../src/configs/guardsFiroConfigs';
import GuardsHandshakeConfigs from '../../src/configs/guardsHandshakeConfigs';
import GuardsZcashConfigs, {
  parseZcashGuardConfig,
} from '../../src/configs/guardsZcashConfigs';
import ChainHandler from '../../src/handlers/chainHandler';
import MultiSigHandler from '../../src/handlers/multiSigHandler';
import { TokenHandler } from '../../src/handlers/tokenHandler';
import TssHandler from '../../src/handlers/tssHandler';

// Exercise the real registry constructor. Native factory behavior is covered by
// zcashHandler.spec; signing mediators are inert in this registration test.
const reserve = 'tmXebSxnVN4HGSTK4icB4i3FitWjNv5u6pt';
const mockTokenHandler = TokenHandler.getInstance();
const legacyTokens = mockTokenHandler.getTokenMap().getRawConfig();
const configuration = () =>
  parseZcashGuardConfig({
    enabled: true,
    rpc: {
      rpcUrl: 'http://127.0.0.1:18232',
      timeoutMs: 10000,
      maxResponseBytes: 1048576,
    },
    sourcePolicy: {
      network: 'regtest',
      genesisHash: 'ab'.repeat(32),
      sourceId: 'registration',
      branches: [{ height: 0, branchId: 'c2d6d0b4' }],
      minimumConfirmations: 1,
      maximumExpiryDelta: 200,
    },
    native: {
      executablePath: process.env.ZCASH_PAYMENT_BIN,
      expectedSha256: process.env.ZCASH_PAYMENT_SHA256,
    },
    inspector: {
      executablePath: process.env.ZCASH_INSPECTOR_BIN,
      expectedSha256: process.env.ZCASH_INSPECTOR_SHA256,
    },
    chain: {
      addresses: { lock: reserve, cold: '', permit: 'permit', fraud: 'fraud' },
      rwtId: 'cd'.repeat(32),
      confirmations: {
        observation: 1,
        payment: 1,
        cold: 1,
        manual: 1,
        arbitrary: 1,
      },
    },
    payment: {
      feeFloorZat: '10000',
      maximumFeeZat: '10000',
      minimumOutputZat: '1000',
      expiryDelta: 200,
    },
    signing: {
      publicKey:
        '0279be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798',
      chainCode: 'abcd',
      derivationPath: [0],
      effectiveThreshold: 1,
      protocolVersion: '6.0.1',
      maxObservationAgeMs: 5000,
    },
  });
const originalAddresses = [
  GuardsDogeConfigs,
  GuardsFiroConfigs,
  GuardsHandshakeConfigs,
].map((c) => c.chainConfigs.addresses);
const clearRegistry = () =>
  Object.defineProperty(ChainHandler, 'instance', {
    value: undefined,
    writable: true,
    configurable: true,
  });

beforeEach(async () => {
  vi.restoreAllMocks();
  clearRegistry();
  const socket = Object.assign(new EventEmitter(), {
    write: vi.fn((request: string) => {
      const parsed = JSON.parse(request) as { id: string };
      queueMicrotask(() => {
        socket.emit(
          'data',
          Buffer.from(
            `${JSON.stringify({
              jsonrpc: '2.0',
              id: parsed.id,
              result: ['registration-test', '1.4'],
            })}\n`,
          ),
        );
      });
      return true;
    }),
    end: vi.fn(),
  });
  vi.spyOn(tls, 'connect').mockReturnValue(socket as unknown as tls.TLSSocket);
  syncBuiltinESMExports();
  const tokenMap = new TokenMap();
  await tokenMap.updateConfigByJson([
    ...legacyTokens,
    {
      zcash: {
        tokenId: 'zec',
        name: 'ZEC',
        decimals: 8,
        type: 'native',
        residency: 'native',
        extra: {},
      },
      ergo: {
        tokenId: 'ab'.repeat(32),
        name: 'rsZEC',
        decimals: 8,
        type: 'token',
        residency: 'wrapped',
        extra: {},
      },
    },
  ]);
  vi.spyOn(mockTokenHandler, 'getTokenMap').mockReturnValue(tokenMap);
  const mediator = { sign: vi.fn(), isInSign: vi.fn(), getPk: vi.fn() };
  vi.spyOn(MultiSigHandler, 'getInstance').mockReturnValue({
    getErgoMultiSig: () => mediator,
  } as unknown as MultiSigHandler);
  vi.spyOn(TssHandler, 'getInstance').mockReturnValue({
    wrapCurveSignMediator: () => mediator,
    wrapEdwardSignMediator: () => mediator,
  } as unknown as TssHandler);
  [GuardsDogeConfigs, GuardsFiroConfigs, GuardsHandshakeConfigs].forEach(
    (c, i) => {
      c.chainConfigs.addresses = {
        ...originalAddresses[i],
        lock: [
          'DHTom1rFwsgAn5raKU1nok8E5MdQ4GBkAN',
          'aD3AxfMEsFmjJd75bHLN2GH8ob2T5Awz4m',
          'hs1qjrhz7jx4u0ded366rm780h82c8c5n2rfcrgpx2',
        ][i],
      };
    },
  );
});

afterEach(() => {
  clearRegistry();
  [GuardsDogeConfigs, GuardsFiroConfigs, GuardsHandshakeConfigs].forEach(
    (c, i) => {
      c.chainConfigs.addresses = originalAddresses[i];
    },
  );
  vi.restoreAllMocks();
  syncBuiltinESMExports();
});

describe('Zcash registration in the actual ChainHandler', () => {
  it('keeps disabled Zcash inaccessible and leaves legacy chains available', () => {
    vi.spyOn(GuardsZcashConfigs, 'read').mockReturnValue(undefined);
    const handler = ChainHandler.getInstance();
    expect(handler.getChain('ergo').CHAIN).toBe('ergo');
    expect(() => handler.getChain('zcash')).toThrow(/not enabled/);
    expect(() => handler.getZcashSigningCapability()).toThrow(/not enabled/);
    expect(() =>
      AddressManager.getInstance().validateAddress('zcash', reserve),
    ).toThrow(/No address validator/);
  });

  it('registers the network codec and shares one lazily built runtime', () => {
    vi.spyOn(GuardsZcashConfigs, 'read').mockReturnValue(configuration());
    const handler = ChainHandler.getInstance();
    expect(() =>
      AddressManager.getInstance().validateAddress('zcash', reserve),
    ).not.toThrow();
    expect(() =>
      AddressManager.getInstance().validateAddress('zcash', 'shielded'),
    ).toThrow();
    const chain = handler.getChain('zcash');
    expect(chain.CHAIN).toBe('zcash');
    expect(handler.getChain('zcash')).toBe(chain);
    expect(chain.getMinimumNativeToken()).toBe(1000n);
  });

  it('does not silently disable malformed enabled configuration', () => {
    vi.spyOn(GuardsZcashConfigs, 'read').mockImplementation(() => {
      throw Error('Invalid Zcash guard configuration');
    });
    expect(() => ChainHandler.getInstance()).toThrow(
      /Invalid Zcash guard configuration/,
    );
  });
});
