import TestUtxoChainNetwork from './network/TestUtxoChainNetwork';
import { AssetBalance } from '../lib';
import { generateUtxoChainObject } from './testUtils';

describe('AbstractUtxoChain', () => {
  describe('getCoveringBoxes', () => {
    const emptyMap = new Map<string, string>();

    /**
     * @target AbstractUtxoChain.getCoveringBoxes should return enough boxes
     * as covered when boxes cover required assets
     * @dependencies
     * @scenario
     * - mock a network object to return 2 boxes
     * - mock chain 'getBoxInfo' function to return mocked boxes assets
     * - mock an AssetBalance object with assets less than box assets
     * - run test
     * - check returned value
     * @expected
     * - it should return first serialized box
     */
    it('should return enough boxes as covered when boxes cover required assets', async () => {
      // Mock a network object to return 2 boxes
      const network = new TestUtxoChainNetwork();
      vi.spyOn(network, 'getAddressBoxes')
        .mockResolvedValue([])
        .mockResolvedValueOnce(['serialized-box-1', 'serialized-box-2']);

      // Mock chain 'getBoxInfo' function to return mocked boxes assets
      const chain = generateUtxoChainObject(network);
      const getBoxInfoSpy = vi.spyOn(chain, 'getBoxInfo');
      getBoxInfoSpy.mockImplementation((boxId: string) => {
        if (boxId === 'serialized-box-1')
          return {
            id: 'box1',
            assets: {
              nativeToken: 100000n,
              tokens: [{ id: 'token1', value: 200n }],
            },
          };
        else if (boxId === 'serialized-box-2')
          return {
            id: 'box2',
            assets: {
              nativeToken: 100000n,
              tokens: [{ id: 'token1', value: 200n }],
            },
          };
        else throw Error(`'getBoxInfo' is not mocked for [${boxId}]`);
      });

      // Mock an AssetBalance object with assets less than box assets
      const requiredAssets: AssetBalance = {
        nativeToken: 50000n,
        tokens: [{ id: 'token1', value: 100n }],
      };

      // Run test
      const result = await chain.callGetCoveringBoxes(
        '',
        requiredAssets,
        [],
        emptyMap
      );

      // Check returned value
      expect(result.covered).toEqual(true);
      expect(result.boxes).toEqual(['serialized-box-1']);
    });

    /**
     * @target AbstractUtxoChain.getCoveringBoxes should return all boxes as
     * NOT covered when boxes do NOT cover required assets
     * @dependencies
     * @scenario
     * - mock a network object to return 2 boxes
     * - mock chain 'getBoxInfo' function to return mocked boxes assets
     * - mock an AssetBalance object with assets more than box assets
     * - run test
     * - check returned value
     * @expected
     * - it should return both serialized boxes
     */
    it('should return all boxes as NOT covered when boxes do NOT cover required assets', async () => {
      // Mock a network object to return 2 boxes
      const network = new TestUtxoChainNetwork();
      vi.spyOn(network, 'getAddressBoxes')
        .mockResolvedValue([])
        .mockResolvedValueOnce(['serialized-box-1', 'serialized-box-2']);

      // Mock chain 'getBoxInfo' function to return mocked boxes assets
      const chain = generateUtxoChainObject(network);
      const getBoxInfoSpy = vi.spyOn(chain, 'getBoxInfo');
      getBoxInfoSpy.mockImplementation((boxId: string) => {
        if (boxId === 'serialized-box-1')
          return {
            id: 'box1',
            assets: {
              nativeToken: 100000n,
              tokens: [{ id: 'token1', value: 200n }],
            },
          };
        else if (boxId === 'serialized-box-2')
          return {
            id: 'box2',
            assets: {
              nativeToken: 100000n,
              tokens: [{ id: 'token1', value: 200n }],
            },
          };
        else throw Error(`'getBoxInfo' is not mocked for [${boxId}]`);
      });

      // Mock an AssetBalance object with assets more than box assets
      const requiredAssets: AssetBalance = {
        nativeToken: 300000n,
        tokens: [{ id: 'token1', value: 100n }],
      };

      // Run test
      const result = await chain.callGetCoveringBoxes(
        '',
        requiredAssets,
        [],
        emptyMap
      );

      // Check returned value
      expect(result.covered).toEqual(false);
      expect(result.boxes).toEqual(['serialized-box-1', 'serialized-box-2']);
    });

    /**
     * @target AbstractUtxoChain.getCoveringBoxes should return all useful boxes
     * as NOT covered key when boxes do NOT cover required tokens
     * @dependencies
     * @scenario
     * - mock a network object to return 2 boxes
     * - mock chain 'getBoxInfo' function to return mocked boxes assets
     *   (second box doesn't contain required token)
     * - mock an AssetBalance object with tokens more than box tokens
     * - run test
     * - check returned value
     * @expected
     * - it should return first serialized box
     */
    it('should return all useful boxes as NOT covered when boxes do NOT cover required tokens', async () => {
      // Mock a network object to return 2 boxes
      const network = new TestUtxoChainNetwork();
      vi.spyOn(network, 'getAddressBoxes')
        .mockResolvedValue([])
        .mockResolvedValueOnce(['serialized-box-1', 'serialized-box-2']);

      // Mock chain 'getBoxInfo' function to return mocked boxes assets
      //  (second box doesn't contain required token)
      const chain = generateUtxoChainObject(network);
      const getBoxInfoSpy = vi.spyOn(chain, 'getBoxInfo');
      getBoxInfoSpy.mockImplementation((boxId: string) => {
        if (boxId === 'serialized-box-1')
          return {
            id: 'box1',
            assets: {
              nativeToken: 100000n,
              tokens: [{ id: 'token1', value: 200n }],
            },
          };
        else if (boxId === 'serialized-box-2')
          return {
            id: 'box2',
            assets: {
              nativeToken: 100000n,
              tokens: [{ id: 'token2', value: 200n }],
            },
          };
        else throw Error(`'getBoxInfo' is not mocked for [${boxId}]`);
      });

      // Mock an AssetBalance object with tokens more than box tokens
      const requiredAssets: AssetBalance = {
        nativeToken: 60000n,
        tokens: [{ id: 'token1', value: 300n }],
      };

      // Run test
      const result = await chain.callGetCoveringBoxes(
        '',
        requiredAssets,
        [],
        emptyMap
      );

      // Check returned value
      expect(result.covered).toEqual(false);
      expect(result.boxes).toEqual(['serialized-box-1']);
    });

    /**
     * @target AbstractUtxoChain.getCoveringBoxes should return enough boxes
     * as covered when two pages boxes cover required assets
     * @dependencies
     * @scenario
     * - mock a network object to return 12 boxes
     * - mock chain 'getBoxInfo' function to return mocked boxes assets
     * - mock an AssetBalance object with assets less than box assets
     * - run test
     * - check returned value
     * @expected
     * - it should return all serialized boxes except the last one
     */
    it('should return enough boxes as covered when two pages boxes cover required assets', async () => {
      // Mock a network object to return 12 boxes
      const network = new TestUtxoChainNetwork();
      vi.spyOn(network, 'getAddressBoxes')
        .mockResolvedValue([])
        .mockResolvedValueOnce(
          Array.from({ length: 10 }, (x, i) => i).map(
            (i) => `serialized-box-${i + 1}`
          )
        )
        .mockResolvedValueOnce(['serialized-box-11', 'serialized-box-12']);

      // Mock chain 'getBoxInfo' function to return mocked boxes assets
      const chain = generateUtxoChainObject(network);
      const getBoxInfoSpy = vi.spyOn(chain, 'getBoxInfo');
      getBoxInfoSpy.mockImplementation((boxId: string) => {
        const i = Number(boxId.slice(15));
        if (i > 0 && i < 13)
          return {
            id: `box${i + 1}`,
            assets: {
              nativeToken: 100000n,
              tokens: [{ id: 'token1', value: 200n }],
            },
          };
        else throw Error(`'getBoxInfo' is not mocked for [${boxId}]`);
      });

      // Mock an AssetBalance object with assets less than box assets
      const requiredAssets: AssetBalance = {
        nativeToken: 1100000n,
        tokens: [{ id: 'token1', value: 900n }],
      };

      // Run test
      const result = await chain.callGetCoveringBoxes(
        '',
        requiredAssets,
        [],
        emptyMap
      );

      // Check returned value
      expect(result.covered).toEqual(true);
      expect(result.boxes).toEqual(
        Array.from({ length: 11 }, (x, i) => i).map(
          (i) => `serialized-box-${i + 1}`
        )
      );
    });

    /**
     * @target AbstractUtxoChain.getCoveringBoxes should return all boxes as
     * NOT covered when two pages boxes do NOT cover required assets
     * @dependencies
     * @scenario
     * - mock a network object to return 12 boxes
     * - mock chain 'getBoxInfo' function to return mocked boxes assets
     * - mock an AssetBalance object with assets more than box assets
     * - run test
     * - check returned value
     * @expected
     * - it should return all 12 serialized boxes
     */
    it('should return all boxes as NOT covered when two pages boxes do NOT cover required assets', async () => {
      // Mock a network object to return 12 boxes
      const network = new TestUtxoChainNetwork();
      vi.spyOn(network, 'getAddressBoxes')
        .mockResolvedValue([])
        .mockResolvedValueOnce(
          Array.from({ length: 10 }, (x, i) => i).map(
            (i) => `serialized-box-${i + 1}`
          )
        )
        .mockResolvedValueOnce(['serialized-box-11', 'serialized-box-12']);

      // Mock chain 'getBoxInfo' function to return mocked boxes assets
      const chain = generateUtxoChainObject(network);
      const getBoxInfoSpy = vi.spyOn(chain, 'getBoxInfo');
      getBoxInfoSpy.mockImplementation((boxId: string) => {
        const i = Number(boxId.slice(15));
        if (i > 0 && i < 13)
          return {
            id: `box${i + 1}`,
            assets: { nativeToken: 100000n, tokens: [] },
          };
        else throw Error(`'getBoxInfo' is not mocked for [${boxId}]`);
      });

      // Mock an AssetBalance object with assets more than box assets
      const requiredAssets: AssetBalance = {
        nativeToken: 1300000n,
        tokens: [],
      };

      // Run test
      const result = await chain.callGetCoveringBoxes(
        '',
        requiredAssets,
        [],
        emptyMap
      );

      // Check returned value
      expect(result.covered).toEqual(false);
      expect(result.boxes).toEqual(
        Array.from({ length: 12 }, (x, i) => i).map(
          (i) => `serialized-box-${i + 1}`
        )
      );
    });

    /**
     * @target AbstractUtxoChain.getCoveringBoxes should return no boxes as
     * NOT covered when address has no boxes
     * @dependencies
     * @scenario
     * - mock a network object to return NO boxes
     * - mock an AssetBalance object with some assets
     * - run test
     * - check returned value
     * @expected
     * - it should return empty list
     */
    it('should return no boxes as NOT covered when address has no boxes', async () => {
      // Mock a network object to return NO boxes
      const network = new TestUtxoChainNetwork();
      vi.spyOn(network, 'getAddressBoxes').mockResolvedValue([]);

      // Mock an AssetBalance object with some assets
      const requiredAssets: AssetBalance = {
        nativeToken: 100000n,
        tokens: [{ id: 'token1', value: 900n }],
      };

      // Run test
      const chain = generateUtxoChainObject(network);
      const result = await chain.callGetCoveringBoxes(
        '',
        requiredAssets,
        [],
        emptyMap
      );

      // Check returned value
      expect(result.covered).toEqual(false);
      expect(result.boxes).toEqual([]);
    });

    /**
     * @target AbstractUtxoChain.getCoveringBoxes should return enough boxes
     * as covered when tracked boxes cover required assets
     * @dependencies
     * @scenario
     * - mock a network object to return 2 boxes
     * - mock a Map to track first box to a new box
     * - mock chain 'getBoxInfo' function to return mocked boxes assets
     * - mock an AssetBalance object with assets less than box assets
     * - run test
     * - check returned value
     * @expected
     * - it should return serialized tracked box
     */
    it('should return enough boxes as covered when tracked boxes cover required assets', async () => {
      // Mock a network object to return 2 boxes
      const network = new TestUtxoChainNetwork();
      vi.spyOn(network, 'getAddressBoxes')
        .mockResolvedValue([])
        .mockResolvedValueOnce(['serialized-box-1', 'serialized-box-2']);

      // Mock a Map to track first box to a new box
      const trackMap = new Map<string, string>();
      trackMap.set('box1', 'serialized-tracked-box-1');

      // Mock chain 'getBoxInfo' function to return mocked boxes assets
      const chain = generateUtxoChainObject(network);
      const getBoxInfoSpy = vi.spyOn(chain, 'getBoxInfo');
      getBoxInfoSpy.mockImplementation((boxId: string) => {
        if (boxId === 'serialized-box-1')
          return {
            id: 'box1',
            assets: {
              nativeToken: 100000n,
              tokens: [{ id: 'token1', value: 200n }],
            },
          };
        else if (boxId === 'serialized-tracked-box-1')
          return {
            id: 'trackedBox1',
            assets: {
              nativeToken: 80000n,
              tokens: [{ id: 'token1', value: 150n }],
            },
          };
        else if (boxId === 'serialized-box-2')
          return {
            id: 'box2',
            assets: {
              nativeToken: 100000n,
              tokens: [{ id: 'token1', value: 200n }],
            },
          };
        else throw Error(`'getBoxInfo' is not mocked for [${boxId}]`);
      });

      // Mock an AssetBalance object with assets less than box assets
      const requiredAssets: AssetBalance = {
        nativeToken: 50000n,
        tokens: [{ id: 'token1', value: 100n }],
      };

      // Run test
      const result = await chain.callGetCoveringBoxes(
        '',
        requiredAssets,
        [],
        trackMap
      );

      // Check returned value
      expect(result.covered).toEqual(true);
      expect(result.boxes).toEqual(['serialized-tracked-box-1']);
    });

    /**
     * @target AbstractUtxoChain.getCoveringBoxes should return all boxes as
     * NOT covered when tracked boxes do NOT cover required assets
     * @dependencies
     * @scenario
     * - mock a network object to return 2 boxes
     * - mock a Map to track first box to a new box
     * - mock chain 'getBoxInfo' function to return mocked boxes assets
     * - mock an AssetBalance object with assets more than box assets
     * - run test
     * - check returned value
     * @expected
     * - it should return serialized tracked boxes
     */
    it('should return all boxes as NOT covered when tracked boxes do NOT cover required assets', async () => {
      // Mock a network object to return 2 boxes
      const network = new TestUtxoChainNetwork();
      vi.spyOn(network, 'getAddressBoxes')
        .mockResolvedValue([])
        .mockResolvedValueOnce(['serialized-box-1', 'serialized-box-2']);

      // Mock a Map to track first box to a new box
      const trackMap = new Map<string, string>();
      trackMap.set('box1', 'serialized-tracked-box-1');

      // Mock chain 'getBoxInfo' function to return mocked boxes assets
      const chain = generateUtxoChainObject(network);
      const getBoxInfoSpy = vi.spyOn(chain, 'getBoxInfo');
      getBoxInfoSpy.mockImplementation((boxId: string) => {
        if (boxId === 'serialized-box-1')
          return {
            id: 'box1',
            assets: {
              nativeToken: 100000n,
              tokens: [{ id: 'token1', value: 200n }],
            },
          };
        else if (boxId === 'serialized-tracked-box-1')
          return {
            id: 'trackedBox1',
            assets: {
              nativeToken: 80000n,
              tokens: [{ id: 'token1', value: 150n }],
            },
          };
        else if (boxId === 'serialized-box-2')
          return {
            id: 'box2',
            assets: {
              nativeToken: 100000n,
              tokens: [{ id: 'token1', value: 200n }],
            },
          };
        else throw Error(`'getBoxInfo' is not mocked for [${boxId}]`);
      });

      // Mock an AssetBalance object with assets less than box assets
      const requiredAssets: AssetBalance = {
        nativeToken: 190000n,
        tokens: [{ id: 'token1', value: 390n }],
      };

      // Run test
      const result = await chain.callGetCoveringBoxes(
        '',
        requiredAssets,
        [],
        trackMap
      );

      // Check returned value
      expect(result.covered).toEqual(false);
      expect(result.boxes).toEqual([
        'serialized-tracked-box-1',
        'serialized-box-2',
      ]);
    });

    /**
     * @target AbstractUtxoChain.getCoveringBoxes should return second box
     * as covered when first box is not allowed
     * @dependencies
     * @scenario
     * - mock a network object to return 2 boxes
     * - mock first box as forbidden
     * - mock chain 'getBoxInfo' function to return mocked boxes assets
     * - mock an AssetBalance object with assets less than box assets
     * - run test
     * - check returned value
     * @expected
     * - it should return second serialized box
     */
    it('should return second box as covered when first box is not allowed', async () => {
      // Mock a network object to return 2 boxes
      const network = new TestUtxoChainNetwork();
      vi.spyOn(network, 'getAddressBoxes')
        .mockResolvedValue([])
        .mockResolvedValueOnce(['serialized-box-1', 'serialized-box-2']);

      // Mock first box as forbidden
      const forbiddenIds = ['box1'];

      // Mock chain 'getBoxInfo' function to return mocked boxes assets
      const chain = generateUtxoChainObject(network);
      const getBoxInfoSpy = vi.spyOn(chain, 'getBoxInfo');
      getBoxInfoSpy.mockImplementation((boxId: string) => {
        if (boxId === 'serialized-box-1')
          return {
            id: 'box1',
            assets: {
              nativeToken: 100000n,
              tokens: [{ id: 'token1', value: 200n }],
            },
          };
        else if (boxId === 'serialized-box-2')
          return {
            id: 'box2',
            assets: {
              nativeToken: 100000n,
              tokens: [{ id: 'token1', value: 200n }],
            },
          };
        else throw Error(`'getBoxInfo' is not mocked for [${boxId}]`);
      });

      // Mock an AssetBalance object with assets less than box assets
      const requiredAssets: AssetBalance = {
        nativeToken: 90000n,
        tokens: [{ id: 'token1', value: 190n }],
      };

      // Run test
      const result = await chain.callGetCoveringBoxes(
        '',
        requiredAssets,
        forbiddenIds,
        emptyMap
      );

      // Check returned value
      expect(result.covered).toEqual(true);
      expect(result.boxes).toEqual(['serialized-box-2']);
    });

    /**
     * @target AbstractUtxoChain.getCoveringBoxes should return no boxes as
     * NOT covered when tracking ends to no box
     * @dependencies
     * @scenario
     * - mock a network object to return one box
     * - mock a Map to track first box to no box
     * - mock chain 'getBoxInfo' function to return mocked boxes assets
     * - mock an AssetBalance object with assets less than box assets
     * - run test
     * - check returned value
     * @expected
     * - it should return empty list
     */
    it('should return no boxes as NOT covered when tracking ends to no box', async () => {
      // Mock a network object to return one box
      const network = new TestUtxoChainNetwork();
      vi.spyOn(network, 'getAddressBoxes')
        .mockResolvedValue([])
        .mockResolvedValueOnce(['serialized-box-1']);

      // Mock a Map to track first box to no box
      const trackMap = new Map<string, string | undefined>();
      trackMap.set('box1', undefined);

      // Mock chain 'getBoxInfo' function to return mocked boxes assets
      const chain = generateUtxoChainObject(network);
      const getBoxInfoSpy = vi.spyOn(chain, 'getBoxInfo');
      getBoxInfoSpy.mockImplementation((boxId: string) => {
        if (boxId === 'serialized-box-1')
          return {
            id: 'box1',
            assets: {
              nativeToken: 100000n,
              tokens: [{ id: 'token1', value: 200n }],
            },
          };
        else throw Error(`'getBoxInfo' is not mocked for [${boxId}]`);
      });

      // Mock an AssetBalance object with assets less than box assets
      const requiredAssets: AssetBalance = {
        nativeToken: 50000n,
        tokens: [{ id: 'token1', value: 100n }],
      };

      // Run test
      const result = await chain.callGetCoveringBoxes(
        '',
        requiredAssets,
        [],
        trackMap
      );

      // Check returned value
      expect(result.covered).toEqual(false);
      expect(result.boxes).toEqual([]);
    });

    /**
     * @target AbstractUtxoChain.getCoveringBoxes should return all boxes as
     * NOT covered when two boxes are tracked to same box
     * @dependencies
     * @scenario
     * - mock a network object to return 2 boxes
     * - mock a Map to track first box to a new box
     * - mock chain 'getBoxInfo' function to return mocked boxes assets
     * - mock an AssetBalance object with assets more than box assets
     * - run test
     * - check returned value
     * @expected
     * - it should return serialized tracked boxes
     */
    it('should return all boxes as NOT covered when two boxes are tracked to same box', async () => {
      // Mock a network object to return 2 boxes
      const network = new TestUtxoChainNetwork();
      vi.spyOn(network, 'getAddressBoxes')
        .mockResolvedValue([])
        .mockResolvedValueOnce(['serialized-box-1', 'serialized-box-2']);

      // Mock a Map to track first box to a new box
      const trackMap = new Map<string, string>();
      trackMap.set('box1', 'serialized-tracked-box-1');
      trackMap.set('box2', 'serialized-tracked-box-1');

      // Mock chain 'getBoxInfo' function to return mocked boxes assets
      const chain = generateUtxoChainObject(network);
      const getBoxInfoSpy = vi.spyOn(chain, 'getBoxInfo');
      getBoxInfoSpy.mockImplementation((boxId: string) => {
        if (boxId === 'serialized-box-1')
          return {
            id: 'box1',
            assets: {
              nativeToken: 100000n,
              tokens: [{ id: 'token1', value: 200n }],
            },
          };
        else if (boxId === 'serialized-tracked-box-1')
          return {
            id: 'trackedBox1',
            assets: {
              nativeToken: 80000n,
              tokens: [{ id: 'token1', value: 150n }],
            },
          };
        else if (boxId === 'serialized-box-2')
          return {
            id: 'box2',
            assets: {
              nativeToken: 100000n,
              tokens: [{ id: 'token1', value: 200n }],
            },
          };
        else throw Error(`'getBoxInfo' is not mocked for [${boxId}]`);
      });

      // Mock an AssetBalance object with assets less than box assets
      const requiredAssets: AssetBalance = {
        nativeToken: 150000n,
        tokens: [{ id: 'token1', value: 250n }],
      };

      // Run test
      const result = await chain.callGetCoveringBoxes(
        '',
        requiredAssets,
        [],
        trackMap
      );

      // Check returned value
      expect(result.covered).toEqual(false);
      expect(result.boxes).toEqual(['serialized-tracked-box-1']);
    });
  });
});
