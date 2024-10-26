import { randomBytes } from 'crypto';
import { CardanoConfigs, CardanoUtxo } from '../lib/types';
import * as CardanoWasm from '@emurgo/cardano-serialization-lib-nodejs';
import CardanoUtils from '../lib/CardanoUtils';
import { RosenTokens } from '@rosen-bridge/tokens';
import { multiDecimalTokenMap, testTokenMap } from './testData';
import TestCardanoNetwork from './network/TestCardanoNetwork';
import { CardanoChain } from '../lib';

export const mockBankBoxes = (): CardanoUtxo[] => {
  const box1: CardanoUtxo = {
    txId: generateRandomId(),
    index: 0,
    value: adaToLovelace(30),
    assets: [
      {
        policy_id: 'cfd784ccfe5fe8ce7d09f4ddb65624378cc8022bf3ec240cf41ea6be',
        asset_name: '43617264616e6f546f6b656e7654657374',
        quantity: 55n,
      },
      {
        policy_id: '48d4a14b8407af8407702df3afda4cc8a945ce55235e9808c62c5f9b',
        asset_name: '5273744572676f546f6b656e7654657374',
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
        policy_id: 'cfd784ccfe5fe8ce7d09f4ddb65624378cc8022bf3ec240cf41ea6be',
        asset_name: '43617264616e6f546f6b656e7654657374',
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
        policy_id: 'ef6aa6200e21634e58ce6796b4b61d1d7d059d2ebe93c2996eeaf286',
        asset_name: '5273744552477654657374',
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
        policy_id: '8e3e19131f96c186335b23bf7983ab00867a987ca900abb27ae0f2b9',
        asset_name: '52535457',
        quantity: 30n,
      },
      {
        policy_id: '8e3e19131f96c186335b23bf7983ab00867a987ca900abb27ae0f2b9',
        asset_name: '52535450',
        quantity: 40n,
      },
    ],
  };

  return [box1, box2, box3, box4, box5];
};

export const AddressUtxoToTransactionOutput = (
  box: CardanoUtxo,
  address: string
): CardanoWasm.TransactionOutput => {
  const value = CardanoWasm.Value.new(CardanoUtils.bigIntToBigNum(box.value));
  const multiAsset = CardanoWasm.MultiAsset.new();
  box.assets.forEach((asset) => {
    const assets = CardanoWasm.Assets.new();
    assets.insert(
      CardanoWasm.AssetName.new(Buffer.from(asset.asset_name, 'hex')),
      CardanoUtils.bigIntToBigNum(asset.quantity)
    );
    multiAsset.insert(CardanoWasm.ScriptHash.from_hex(asset.policy_id), assets);
  });

  value.set_multiasset(multiAsset);
  const output = CardanoWasm.TransactionOutput.new(
    CardanoWasm.Address.from_bech32(address),
    value
  );
  return output;
};

export const AddressUtxoToTransactionInput = (
  box: CardanoUtxo
): CardanoWasm.TransactionInput => {
  const input = CardanoWasm.TransactionInput.new(
    CardanoWasm.TransactionHash.from_bytes(Buffer.from(box.txId, 'hex')),
    box.index
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
export const mockedSignFn = () => Promise.resolve('');
export const generateChainObject = (
  network: TestCardanoNetwork,
  signFn: (txHash: Uint8Array) => Promise<string> = mockedSignFn
) => {
  return new CardanoChain(network, configs, testTokenMap, signFn);
};
export const generateChainObjectWithMultiDecimalTokenMap = (
  network: TestCardanoNetwork,
  signFn: (txHash: Uint8Array) => Promise<string> = mockedSignFn
) => {
  return new CardanoChain(network, configs, multiDecimalTokenMap, signFn);
};
