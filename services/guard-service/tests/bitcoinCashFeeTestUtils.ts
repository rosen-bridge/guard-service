import { MinimumFeeBox } from '@rosen-bridge/minimum-fee';
import { EventTrigger } from '@rosen-chains/abstract-chain';

/** The synthetic wrapped BCH asset used by the independent fee rows. */
export const wrapped = '56'.repeat(32);
/** Build a fresh BCH trigger whose chain, amount or height can be faulted. */
export const event = (changes: Partial<EventTrigger> = {}): EventTrigger => ({
  height: 99999,
  fromChain: 'bitcoin-cash',
  toChain: 'ergo',
  fromAddress: 'box:' + '11'.repeat(32) + '.0',
  toAddress: 'receiver',
  amount: '1000000',
  bridgeFee: '3',
  networkFee: '4',
  sourceChainTokenId: 'bch',
  targetChainTokenId: wrapped,
  sourceTxId: '22'.repeat(32),
  sourceChainHeight: 101,
  sourceBlockId: '33'.repeat(32),
  WIDsHash: '44'.repeat(32),
  WIDsCount: 1,
  ...changes,
});
/** Fetch synthetic decoded R4-R9 fee rows through a bounded fake box provider. */
export const feeBox = async (chains = ['bitcoin-cash', 'ergo']) => {
  const values = {
    R4: chains.map((chain) => [...Buffer.from(chain)]),
    R5: [
      [100, 200],
      [150, 300],
    ],
    R6: [
      ['31', '11'],
      ['32', '12'],
    ],
    R7: [
      ['41', '21'],
      ['42', '22'],
    ],
    R8: [
      [
        ['1', '100'],
        ['2', '100'],
      ],
      [
        ['3', '100'],
        ['4', '100'],
      ],
    ],
    R9: [
      ['0', '0'],
      ['0', '0'],
    ],
  };
  const box = {
    boxId: 'fee-box',
    assets: [{ tokenId: 'nft' }, { tokenId: wrapped }],
    additionalRegisters: Object.fromEntries(
      Object.entries(values).map(([key, value]) => [
        key,
        JSON.stringify(value),
      ]),
    ),
  };
  const fees = new MinimumFeeBox(
    wrapped,
    'nft',
    {
      /** Return only the synthetic fee box without network requests. */
      getBoxesByTokenId: async () => [box],
    } as unknown as ConstructorParameters<typeof MinimumFeeBox>[2],
    JSON.parse,
  );
  expect(await fees.fetchBox()).toEqual(true);
  return fees;
};
