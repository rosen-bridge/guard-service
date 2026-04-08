import * as CardanoWasm from '@emurgo/cardano-serialization-lib-nodejs';
import { randomBytes } from 'crypto';

import { TokenMap } from '@rosen-bridge/tokens';
import { EddsaSignMediator } from '@rosen-chains/abstract-chain';

import { CardanoChain } from '../lib';
import CardanoUtils from '../lib/cardanoUtils';
import { CardanoConfigs, CardanoUtxo } from '../lib/types';
import TestCardanoNetwork from './network/testCardanoNetwork';
import { multiDecimalTokenMap, testTokenMap } from './testData';

export const mockBankBoxes = (): CardanoUtxo[] => {
  const box1: CardanoUtxo = {
    txId: generateRandomId(),
    index: 0,
    value: adaToLovelace(30),
    assets: [
      {
        policyId: 'cfd784ccfe5fe8ce7d09f4ddb65624378cc8022bf3ec240cf41ea6be',
        assetName: '43617264616e6f546f6b656e7654657374',
        quantity: 55n,
      },
      {
        policyId: '48d4a14b8407af8407702df3afda4cc8a945ce55235e9808c62c5f9b',
        assetName: '5273744572676f546f6b656e7654657374',
        quantity: 5000n,
      },
    ],
  };
  const box2: CardanoUtxo = {
    txId: generateRandomId(),
    index: 0,
    value: adaToLovelace(1234567891011),
    assets: [
      {
        policyId: 'cfd784ccfe5fe8ce7d09f4ddb65624378cc8022bf3ec240cf41ea6be',
        assetName: '43617264616e6f546f6b656e7654657374',
        quantity: 45n,
      },
    ],
  };
  const box3: CardanoUtxo = {
    txId: generateRandomId(),
    index: 2,
    value: adaToLovelace(10),
    assets: [],
  };
  const box4: CardanoUtxo = {
    txId: generateRandomId(),
    index: 0,
    value: 10000n,
    assets: [
      {
        policyId: 'ef6aa6200e21634e58ce6796b4b61d1d7d059d2ebe93c2996eeaf286',
        assetName: '5273744552477654657374',
        quantity: 1000n,
      },
    ],
  };
  const box5: CardanoUtxo = {
    txId: generateRandomId(),
    index: 3,
    value: 10000000n,
    assets: [
      {
        policyId: '8e3e19131f96c186335b23bf7983ab00867a987ca900abb27ae0f2b9',
        assetName: '52535457',
        quantity: 30n,
      },
      {
        policyId: '8e3e19131f96c186335b23bf7983ab00867a987ca900abb27ae0f2b9',
        assetName: '52535450',
        quantity: 40n,
      },
    ],
  };

  return [box1, box2, box3, box4, box5];
};

export const AddressUtxoToTransactionOutput = (
  box: CardanoUtxo,
  address: string,
): CardanoWasm.TransactionOutput => {
  const value = CardanoWasm.Value.new(CardanoUtils.bigIntToBigNum(box.value));
  const multiAsset = CardanoWasm.MultiAsset.new();
  box.assets.forEach((asset) => {
    const assets = CardanoWasm.Assets.new();
    assets.insert(
      CardanoWasm.AssetName.new(Buffer.from(asset.assetName, 'hex')),
      CardanoUtils.bigIntToBigNum(asset.quantity),
    );
    multiAsset.insert(CardanoWasm.ScriptHash.from_hex(asset.policyId), assets);
  });

  value.set_multiasset(multiAsset);
  const output = CardanoWasm.TransactionOutput.new(
    CardanoWasm.Address.from_bech32(address),
    value,
  );
  return output;
};

export const AddressUtxoToTransactionInput = (
  box: CardanoUtxo,
): CardanoWasm.TransactionInput => {
  const input = CardanoWasm.TransactionInput.new(
    CardanoWasm.TransactionHash.from_bytes(Buffer.from(box.txId, 'hex')),
    box.index,
  );
  return input;
};

export const adaToLovelace = (ada: number): bigint =>
  BigInt((ada * 1000000).toString());

export const generateRandomId = (): string => randomBytes(32).toString('hex');

export const protocolParameters = {
  minFeeA: 44,
  minFeeB: 155381,
  poolDeposit: '500000000',
  keyDeposit: '2000000',
  maxValueSize: 4000,
  maxTxSize: 8000,
  coinsPerUtxoSize: '4311',
};

export const observationTxConfirmation = 5;
export const paymentTxConfirmation = 9;
export const coldTxConfirmation = 10;
export const manualTxConfirmation = 11;
export const arbitraryTxConfirmation = 12;
export const rwtId =
  '9410db5b39388c6b515160e7248346d7ec63d5457292326da12a26cc02efb526';
export const minBoxValue = 2000000n;
export const configs: CardanoConfigs = {
  fee: 1000000n,
  minBoxValue: minBoxValue,
  txTtl: 64,
  addresses: {
    lock: 'addr1qxwkc9uhw02wvkgw9qkrw2twescuc2ss53t5yaedl0zcyen2a0y7redvgjx0t0al56q9dkyzw095eh8jw7luan2kh38qpw3xgs',
    cold: 'cold',
    permit: 'permit',
    fraud: 'fraud',
  },
  rwtId: rwtId,
  confirmations: {
    observation: observationTxConfirmation,
    payment: paymentTxConfirmation,
    cold: coldTxConfirmation,
    manual: manualTxConfirmation,
    arbitrary: arbitraryTxConfirmation,
  },
  aggregatedPublicKey:
    'bcb07faa6c0f19e2f2587aa9ef6f43a68fc0135321216a71dc87c8527af4ca6a',
};
export const mockedSignMediator = {
  sign: vi.fn(),
  isInSign: vi.fn().mockResolvedValue(true),
};
export const generateChainObject = async (
  network: TestCardanoNetwork,
  signMediator: EddsaSignMediator = mockedSignMediator,
) => {
  const tokenMap = new TokenMap();
  await tokenMap.updateConfigByJson(testTokenMap);
  return new CardanoChain(network, configs, tokenMap, signMediator);
};
export const generateChainObjectWithMultiDecimalTokenMap = async (
  network: TestCardanoNetwork,
  signMediator: EddsaSignMediator = mockedSignMediator,
) => {
  const tokenMap = new TokenMap();
  await tokenMap.updateConfigByJson(multiDecimalTokenMap);
  return new CardanoChain(network, configs, tokenMap, signMediator);
};
