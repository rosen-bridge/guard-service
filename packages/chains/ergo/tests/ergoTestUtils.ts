import { AbstractLogger } from '@rosen-bridge/abstract-logger';
import { RosenTokens } from '@rosen-bridge/tokens';
import { randomBytes } from 'crypto';
import * as wasm from 'ergo-lib-wasm-nodejs';
import TestErgoNetwork from './network/TestErgoNetwork';
import { ErgoChain, ErgoConfigs } from '../lib';
import { transaction2SignedSerialized } from './transactionTestData';

export const testTokenMap: RosenTokens = {
  idKeys: {
    ergo: 'tokenId',
    cardano: 'tokenId',
    bitcoin: 'tokenId',
  },
  tokens: [],
};
export const multiDecimalTokenMap: RosenTokens = {
  idKeys: {
    ergo: 'tokenId',
    cardano: 'tokenId',
  },
  tokens: [
    {
      ergo: {
        tokenId: 'erg',
        name: 'erg',
        decimals: 9,
        metaData: {
          type: 'ERG',
          residency: 'native',
        },
      },
      cardano: {
        tokenId:
          'ef6aa6200e21634e58ce6796b4b61d1d7d059d2ebe93c2996eeaf286.5273744552477654657374',
        name: 'RstERGvTest',
        policyId: 'ef6aa6200e21634e58ce6796b4b61d1d7d059d2ebe93c2996eeaf286',
        assetName: '5273744552477654657374',
        decimals: 10,
        metaData: {
          type: 'native',
          residency: 'wrapped',
        },
      },
    },
    {
      ergo: {
        tokenId:
          '10278c102bf890fdab8ef5111e94053c90b3541bc25b0de2ee8aa6305ccec3de',
        name: 'Ergo-Token.V-test',
        decimals: 1,
        metaData: {
          type: 'EIP-004',
          residency: 'native',
        },
      },
      cardano: {
        tokenId:
          '48d4a14b8407af8407702df3afda4cc8a945ce55235e9808c62c5f9b.5273744572676f546f6b656e7654657374',
        name: 'RstErgoTokenvTest',
        policyId: '48d4a14b8407af8407702df3afda4cc8a945ce55235e9808c62c5f9b',
        assetName: '5273744572676f546f6b656e7654657374',
        decimals: 0,
        metaData: {
          type: 'native',
          residency: 'wrapped',
        },
      },
    },
    {
      ergo: {
        tokenId:
          '895a0268c749b9ab894e4d064a783dfe1361b64c9d99857c391390d630ebe2d2',
        name: 'RST-Cardano-Token.V-test',
        decimals: 4,
        metaData: {
          type: 'EIP-004',
          residency: 'wrapped',
        },
      },
      cardano: {
        tokenId:
          'cfd784ccfe5fe8ce7d09f4ddb65624378cc8022bf3ec240cf41ea6be.43617264616e6f546f6b656e7654657374',
        name: 'CardanoTokenvTest',
        policyId: 'cfd784ccfe5fe8ce7d09f4ddb65624378cc8022bf3ec240cf41ea6be',
        assetName: '43617264616e6f546f6b656e7654657374',
        decimals: 3,
        metaData: {
          type: 'native',
          residency: 'native',
        },
      },
    },
    {
      ergo: {
        tokenId:
          '7b0cc1b9c6e3dbf41a8cd0fe059a545dfbd0dfafc4093d0555a9851f06662dff',
        name: 'test',
        decimals: 2,
        metaData: {
          type: 'EIP-004',
          residency: 'wrapped',
        },
      },
      cardano: {
        tokenId:
          'e043fa0e1adaa5abeca716791384b64be4d15c7d1e80817e43992e4a.43617264616e6f546f6b656e7654657374',
        name: 'test',
        policyId: 'e043fa0e1adaa5abeca716791384b64be4d15c7d1e80817e43992e4a',
        assetName: '43617264616e6f546f6b656e7654657374',
        decimals: 1,
        metaData: {
          type: 'native',
          residency: 'native',
        },
      },
    },
    {
      ergo: {
        tokenId:
          '3688bf4dbfa9e77606446ca0189546621097cee6979e2befc8ef56825ba82580',
        name: 'test',
        decimals: 2,
        metaData: {
          type: 'EIP-004',
          residency: 'wrapped',
        },
      },
      cardano: {
        tokenId:
          '55ca25ad5c788597f13e5c61d415315e8ac1f40e08d172a7809c016c.43617264616e6f546f6b656e7654657374',
        name: 'test',
        policyId: 'e043fa0e1adaa5abeca716791384b64be4d15c7d1e80817e43992e4a',
        assetName: '43617264616e6f546f6b656e7654657374',
        decimals: 2,
        metaData: {
          type: 'native',
          residency: 'native',
        },
      },
    },
  ],
};
export const wrappedRwtTokenMap: RosenTokens = {
  idKeys: {
    ergo: 'tokenId',
    cardano: 'tokenId',
  },
  tokens: [
    {
      ergo: {
        tokenId:
          '9410db5b39388c6b515160e7248346d7ec63d5457292326da12a26cc02efb526',
        name: 'Ergo-RWT.V-test',
        decimals: 1,
        metaData: {
          type: 'EIP-004',
          residency: 'wrapped',
        },
      },
      cardano: {
        tokenId:
          'cfd784ccfe5fe8ce7d09f4ddb65624378cc8022bf3ec240cf41ea6be.43617264616e6f546f6b656e7654657374',
        name: 'CardanoTokenvTest',
        policyId: 'cfd784ccfe5fe8ce7d09f4ddb65624378cc8022bf3ec240cf41ea6be',
        assetName: '43617264616e6f546f6b656e7654657374',
        decimals: 0,
        metaData: {
          type: 'native',
          residency: 'native',
        },
      },
    },
  ],
};

export const testLockAddress =
  '9es3xKFSehNNwCpuNpY31ScAubDqeLbSWwaCysjN1ee51bgHKTq';

export const defaultSignFunction = async (
  tx: wasm.ReducedTransaction,
  requiredSign: number,
  boxes: Array<wasm.ErgoBox>,
  dataBoxes?: Array<wasm.ErgoBox>
): Promise<wasm.Transaction> =>
  deserializeTransaction(transaction2SignedSerialized);

export const observationTxConfirmation = 5;
export const paymentTxConfirmation = 9;
export const coldTxConfirmation = 10;
export const manualTxConfirmation = 11;
export const arbitraryTxConfirmation = 12;
export const defaultConfirmations = {
  observation: observationTxConfirmation,
  payment: paymentTxConfirmation,
  cold: coldTxConfirmation,
  manual: manualTxConfirmation,
  arbitrary: arbitraryTxConfirmation,
};
export const rwtId =
  '9410db5b39388c6b515160e7248346d7ec63d5457292326da12a26cc02efb526';
export const generateChainObject = (
  network: TestErgoNetwork,
  rwt = rwtId,
  signFn: (
    tx: wasm.ReducedTransaction,
    requiredSign: number,
    boxes: Array<wasm.ErgoBox>,
    dataBoxes?: Array<wasm.ErgoBox>
  ) => Promise<wasm.Transaction> = defaultSignFunction
) => {
  const config: ErgoConfigs = {
    fee: 100n,
    confirmations: defaultConfirmations,
    addresses: {
      lock: testLockAddress,
      cold: 'cold_addr',
      permit: 'permit_addr',
      fraud: 'fraud_addr',
    },
    rwtId: rwt,
    minBoxValue: 1000000n,
    eventTxConfirmation: 18,
  };
  // mock a sign function to return signed transaction
  return new ErgoChain(network, config, testTokenMap, signFn);
};
export const generateDefaultChainObjectWithTokenMap = (
  network: TestErgoNetwork,
  tokenMap: RosenTokens
) => {
  const config: ErgoConfigs = {
    fee: 100n,
    confirmations: defaultConfirmations,
    addresses: {
      lock: testLockAddress,
      cold: 'cold_addr',
      permit: 'permit_addr',
      fraud: 'fraud_addr',
    },
    rwtId: rwtId,
    minBoxValue: 1000000n,
    eventTxConfirmation: 18,
  };
  // mock a sign function to return signed transaction
  return new ErgoChain(network, config, tokenMap, defaultSignFunction);
};

/**
 * generates 32 bytes random data used for the identifiers such as txId
 */
export const generateRandomId = (): string => randomBytes(32).toString('hex');

/**
 * converts json representation of a box into ErgoBox object
 * @param boxJson
 */
export const toErgoBox = (boxJson: string): wasm.ErgoBox =>
  wasm.ErgoBox.from_json(boxJson);

/**
 * converts json representation of a transaction into Transaction object
 * @param txJson
 */
export const toTransaction = (txJson: string): wasm.Transaction =>
  wasm.Transaction.from_json(txJson);

/**
 * deserializes transaction into Transaction object
 * @param serializedTx
 */
export const deserializeTransaction = (
  serializedTx: string
): wasm.Transaction =>
  wasm.Transaction.sigma_parse_bytes(Buffer.from(serializedTx, 'hex'));
