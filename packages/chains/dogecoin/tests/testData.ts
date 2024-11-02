import { RosenTokens } from '@rosen-bridge/tokens';
import { EventTrigger, PaymentOrder } from '@rosen-chains/abstract-chain';

export const testTokenMap: RosenTokens = JSON.parse(`
{
  "idKeys" : {
    "ergo" : "tokenId",
    "cardano" : "tokenId",
    "dogecoin" : "tokenId"
  },
  "tokens" : []
}
`);

export const multiDecimalTokenMap: RosenTokens = JSON.parse(`
{
  "idKeys" : {
    "ergo" : "tokenId",
    "cardano" : "tokenId",
    "dogecoin" : "tokenId"
  },
  "tokens" : [
    {
      "ergo": {
        "tokenId": "1c7435e608ab710c56bbe0f635e2a5e86ddf856f7d3d2d1d4dfefa62fbbfb9b4",
        "name": "testDOGE",
        "decimals": 3,
        "metaData": {
          "type": "EIP-004",
          "residency": "wrapped"
        }
      },
      "cardano": {
        "tokenId": "6d7cc9577a04be165cc4f2cf36f580dbeaf88f68e78f790805430940.72734254432d6c6f656e",
        "policyId": "6d7cc9577a04be165cc4f2cf36f580dbeaf88f68e78f790805430940",
        "assetName": "72734254432d6c6f656e",
        "name": "rsDOGE-loen",
        "decimals": 6,
        "metaData": {
          "type": "CIP26",
          "residency": "wrapped"
        }
      },
      "dogecoin": {
        "tokenId": "doge",
        "name": "DOGE",
        "decimals": 8,
        "metaData": {
          "type": "native",
          "residency": "native"
        }
      }
    }
  ]
}
`);

export const transaction0PaymentTransaction = `{
  "network": "dogecoin",
  "eventId": "",
  "txBytes": "70736274ff0100710200000001972da36330161ef9af99788ccc7261f81e2a046049d1ee65ad724288159633640100000000ffffffff02f242993b00000000160014828037cbcbed02c6d9948e51b89c44da3a3b81fca086010000000000160014b20272a6591937ba7d687dc889f3637ed40efa6a000000000001011f00ca9a3b00000000160014fdfe06abec6a565eff3604db30fd30069b2f2a28000000",
  "txId": "502559f8e22792d537f226bfac7c3bc972de1a9a13651b325c40ec5a52ea1297",
  "txType": "manual",
  "inputUtxos": [
    "{\\"txId\\":\\"64339615884272ad65eed14960042a1ef86172cc8c7899aff91e163063a32d97\\",\\"index\\":1,\\"value\\":1000000000}"
  ]
}`;
export const transaction0PsbtHex =
  '70736274ff0100710200000001972da36330161ef9af99788ccc7261f81e2a046049d1ee65ad724288159633640100000000ffffffff02f242993b00000000160014828037cbcbed02c6d9948e51b89c44da3a3b81fca086010000000000160014b20272a6591937ba7d687dc889f3637ed40efa6a000000000001011f00ca9a3b00000000160014fdfe06abec6a565eff3604db30fd30069b2f2a28000000';
export const transaction0Input0BoxId =
  '64339615884272ad65eed14960042a1ef86172cc8c7899aff91e163063a32d97.1';

// ... other transactions and data adapted similarly ...

export const lockAddress = 'doge1qlhlqd2lvdft9alekqndnplfsq6dj723gh49wrt';
export const lockAddressPublicKey =
  '0345307e1165c99d12557bea11f8c8cd0f6bc057fb51952e824bc7c760fda07335';
export const lockUtxo = {
  txId: 'f1ac0a7ce8a45aa53ac245ea2178592f708c9ef38bee0a5bd88c9f08d47ce493',
  index: 1,
  scriptPubKey: '0014b20272a6591937ba7d687dc889f3637ed40efa6a',
  value: 3000000000n,
};

export const validEvent: EventTrigger = {
  height: 300,
  fromChain: 'dogecoin',
  toChain: 'ergo',
  fromAddress: 'fromAddress',
  toAddress: 'toAddress',
  amount: '1000000',
  bridgeFee: '1000',
  networkFee: '5000',
  sourceChainTokenId: 'sourceTokenId',
  targetChainTokenId: 'targetTokenId',
  sourceTxId:
    '6e3dbf41a8e3dbf41a8cd0fe059a54cef8bb140322503d0555a9851f056825bc',
  sourceChainHeight: 1000,
  sourceBlockId:
    '01a33c00accaa91ebe0c946bffe1ec294280a3a51a90f7f4b011f3f37c29c5ed',
  WIDsHash: 'bb2b2272816e1e9993fc535c0cf57c668f5cd39c67cfcd55b4422b1aa87cd0c3',
  WIDsCount: 2,
};

// ... other events and data adapted similarly ...
