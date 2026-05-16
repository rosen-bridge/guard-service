vi.mock('ethers', async (importOriginal) => {
  const ref = await importOriginal<typeof import('ethers')>();
  return {
    ...ref,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    JsonRpcProvider: vi.fn().mockImplementation((url: string) => {
      return rpcInstance;
    }),
    ethers: {
      ...ref.ethers,
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      Contract: vi.fn().mockImplementation((tokenId, ABI, provider) => {
        return ContractInstance;
      }),
    },
  };
});

export const ContractInstance = {
  getL1GasUsed: vi.fn(),
};

const rpcInstance = {
  estimateGas: vi.fn(),
  getBlock: vi.fn(),
  getFeeData: vi.fn(),
  _getConnection: () => {
    return {
      timeout: 0,
    };
  },
};
