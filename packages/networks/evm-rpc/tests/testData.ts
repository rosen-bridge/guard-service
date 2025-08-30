import {
  Block,
  FeeData,
  JsonRpcProvider,
  Signature,
  Transaction,
  TransactionResponse,
} from 'ethers';

export const blockHeight = 19946077;
export const blockHash =
  '0xcc86833c39fab360cbe1fb9e2d9b3cce255718b32d0706ea722f5b678c947943';
export const getBlockResponse = new Block(
  {
    baseFeePerGas: 4113699091n,
    difficulty: 0n,
    extraData: '0x6a6574626c64722e78797a',
    gasLimit: 30000000n,
    gasUsed: 12629788n,
    blobGasUsed: 131072n,
    excessBlobGas: 131072n,
    hash: '0xcc86833c39fab360cbe1fb9e2d9b3cce255718b32d0706ea722f5b678c947943',
    miner: '0x88c6C46EBf353A52Bdbab708c23D0c81dAA8134A',
    nonce: '0x0000000000000000',
    number: 19946077,
    parentHash:
      '0x89fdc1ad47ef180dc386408db6ad8dce30dd90266c095cfd46b74abaff36a742',
    timestamp: 1716630251,
    parentBeaconBlockRoot:
      '0xb9dd0cad10a0fa8d0f7a32683998e48fe270a82668fc8c5df65c2bbbed8c4ba2',
    stateRoot:
      '0xdd38edf0b005548cc2f8bbabef9c9c010f145289bec88d6ee80696463fbcc648',
    receiptsRoot:
      '0xf1bdf4d6cf5391e976bd43e1a144b4a4707dea87a685e88089cd409021610d89',
    transactions: [
      '0x5861229ef0f76a5ceb80ba2811c397eb017de5b5374af96815a6eb38b8e0d187',
      '0x4c92c6879c91103828be656456e875eb8fe30ca2d8c119a4be6e95cdfe8959dc',
      '0xa1eba352263f4a7b403c43ad2364b5dab6f5965a31904a482711659adbe041cc',
      '0xed7acbcbd305f7fb85a4e7ac971eb82bb0bdb5b4894fada42399176378b46955',
    ],
  },
  new JsonRpcProvider()
);
export const blockTxIds = [
  '0x5861229ef0f76a5ceb80ba2811c397eb017de5b5374af96815a6eb38b8e0d187',
  '0x4c92c6879c91103828be656456e875eb8fe30ca2d8c119a4be6e95cdfe8959dc',
  '0xa1eba352263f4a7b403c43ad2364b5dab6f5965a31904a482711659adbe041cc',
  '0xed7acbcbd305f7fb85a4e7ac971eb82bb0bdb5b4894fada42399176378b46955',
];
export const blockInfo = {
  hash: '0xcc86833c39fab360cbe1fb9e2d9b3cce255718b32d0706ea722f5b678c947943',
  parentHash:
    '0x89fdc1ad47ef180dc386408db6ad8dce30dd90266c095cfd46b74abaff36a742',
  height: 19946077,
};

export const lockAddress = '0x8c41E9904498505B49b0B9eE1e551F538A464E8f';
export const addressTxCount = 7;

export const transaction0Response = new TransactionResponse(
  {
    blockNumber: 19195927,
    blockHash:
      '0x3fe54add83a1b7122039ddfc4a5e6b2a4116791b2db5d4f6e3a5cd2a36737acc',
    maxFeePerBlobGas: null,
    blobVersionedHashes: null,
    index: 0,
    hash: '0xd5c1486c432bdbde219639b50ccd1c6258690413a1c229014761aac7e74b1e0c',
    type: 2,
    to: '0x823556202e86763853b40e9cDE725f412e294689',
    from: '0x4bb5655B942D56ccd346106037650bB62d961A2e',
    nonce: 125,
    gasLimit: 71024n,
    gasPrice: 32076327370n,
    maxPriorityFeePerGas: 300000000n,
    maxFeePerGas: 44000000000n,
    data: '0x095ea7b30000000000000000000000001111111254eeb25477b68fb85ed929f73a9605820000000000000000000000000000000000000000000014765735f219af6a4b97',
    value: 0n,
    chainId: 1n,
    signature: Signature.from({
      r: '0xef57677ba4f282022ad579aabe1ef8f28e0e2ba5d8695bab87e85e0258261e2b',
      s: '0x108174f3a65d72997fa4d947bb9b53e439bbfa806b5000dde8d9ae3a6e83f3dd',
      yParity: 0,
      networkV: null,
    }),
    accessList: [],
  },
  new JsonRpcProvider()
);
export const transaction0 = Transaction.from(transaction0Response);
export const transaction0Id =
  '0xd5c1486c432bdbde219639b50ccd1c6258690413a1c229014761aac7e74b1e0c';
export const transaction0BlockId =
  '0x3fe54add83a1b7122039ddfc4a5e6b2a4116791b2db5d4f6e3a5cd2a36737acc';

export const tokenId = '0x62a57cf44fc633e71f8504c17b9d3b29a78f7bd0';
export const tokenName = 'custom-name';
export const tokenDecimals = 7n;
export const balance = 123456789n;

export const gasLimit = 30000n;

export const gasPrice = 16137943919n;
export const maxFeePerGas = 32274887838n;
export const maxPriorityFeePerGas = 1000000n;
export const feeDataResponse = new FeeData(
  gasPrice,
  maxFeePerGas,
  maxPriorityFeePerGas
);
