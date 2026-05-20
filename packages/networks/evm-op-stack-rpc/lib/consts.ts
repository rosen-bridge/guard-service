export const gasPriceOracleAddress =
  '0x420000000000000000000000000000000000000F';

export const partialGasPriceOracleAbi = [
  {
    inputs: [{ internalType: 'bytes', name: '_data', type: 'bytes' }],
    name: 'getL1GasUsed',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
];
