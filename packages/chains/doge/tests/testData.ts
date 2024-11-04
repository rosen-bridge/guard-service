import { RosenTokens } from '@rosen-bridge/tokens';
import { EventTrigger, PaymentOrder } from '@rosen-chains/abstract-chain';

export const testTokenMap: RosenTokens = JSON.parse(`
{
  "idKeys" : {
    "ergo" : "tokenId",
    "dogecoin" : "tokenId"
  },
  "tokens" : []
}
`);

export const multiDecimalTokenMap: RosenTokens = JSON.parse(`
{
  "idKeys" : {
    "ergo" : "tokenId",
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
export const transaction0Input0BoxId =
  '64339615884272ad65eed14960042a1ef86172cc8c7899aff91e163063a32d97.1';

// Add additional transactions and data from Bitcoin testData
export const transaction1PaymentTransaction = `{
  "network": "bitcoin",
  "eventId": "",
  "txBytes": "70736274ff0100880200000001972da36330161ef9af99788ccc7261f81e2a046049d1ee65ad724288159633640100000000ffffffff0300000000000000000e6a0c6161616161616161616161618442993b00000000160014828037cbcbed02c6d9948e51b89c44da3a3b81fca086010000000000160014b20272a6591937ba7d687dc889f3637ed40efa6a000000000001011f00ca9a3b00000000160014fdfe06abec6a565eff3604db30fd30069b2f2a2800000000",
  "txId": "a451d0c24a8c871f52707cf2fcf0cb35f5b1ac6c734fb5cd172893d48d782e91",
  "txType": "manual",
  "inputUtxos": [
    "{\\"txId\\":\\"64339615884272ad65eed14960042a1ef86172cc8c7899aff91e163063a32d97\\",\\"index\\":1,\\"value\\":1000000000}"
  ]
}`;

export const transaction1InputIds = [
  '64339615884272ad65eed14960042a1ef86172cc8c7899aff91e163063a32d97.1',
];

export const transaction2PaymentTransaction = `{
  "network": "dogecoin",
  "eventId": "",
  "txBytes": "70736274ff01009a0200000002193a28a12c8be889390e48b30cf9c65096f3f51bc04c2475557096d0cfca4f220100000000ffffffffd2e6232676e35e104927f22d4c90bc367c684209a4937664bad886227cd95c4b0100000000ffffffff028063ef2700000000160014828037cbcbed02c6d9948e51b89c44da3a3b81fcaff9e08a00000000160014fdfe06abec6a565eff3604db30fd30069b2f2a28000000000001011f00ca9a3b00000000160014fdfe06abec6a565eff3604db30fd30069b2f2a280001011f0094357700000000160014fdfe06abec6a565eff3604db30fd30069b2f2a28000000",
  "txId": "5bc486302164841b32bdfa03f510590109e3520d0a0aa6a15edfea0c8e33a080",
  "txType": "manual",
  "inputUtxos": [
    "{\\"txId\\":\\"224fcacfd096705575244cc01bf5f39650c6f90cb3480e3989e88b2ca1283a19\\",\\"index\\":1,\\"value\\":1000000000}",
    "{\\"txId\\":\\"4b5cd97c2286d8ba647693a40942687c36bc904c2df22749105ee3762623e6d2\\",\\"index\\":1,\\"value\\":2000000000}"
  ]
}`;
export const transaction2Assets = {
  inputAssets: {
    nativeToken: 3000000000n,
    tokens: [],
  },
  outputAssets: {
    nativeToken: 3000000000n,
    tokens: [],
  },
};
export const transaction2WrappedAssets = {
  inputAssets: {
    nativeToken: 30000n,
    tokens: [],
  },
  outputAssets: {
    nativeToken: 30000n,
    tokens: [],
  },
};
export const transaction2Order: PaymentOrder = [
  {
    address: 'DHTom1rFwsgAn5raKU1nok8E5MdQ4GBkAN',
    assets: {
      nativeToken: 670000000n,
      tokens: [],
    },
  },
];
export const transaction2WrappedOrder: PaymentOrder = [
  {
    address: 'DHTom1rFwsgAn5raKU1nok8E5MdQ4GBkAN',
    assets: {
      nativeToken: 6700n,
      tokens: [],
    },
  },
];
export const transaction2HashMessage0 =
  'e0a1eee59b0b5d5b0b115bece85a4193d7224a6d5dccdb019fe8f9cb0ef39ba5';
export const transaction2Signature0 =
  '22140681b4b7d5a099cb427a0bf0cd3085ecfd583c9908891058a84def1ab8a238e202c53ab6f52776166218353984dbee87ffa5979e72bf2ebf731eadb30093';
export const transaction2HashMessage1 =
  '7596325971d5981233c9cecf0abb52c36a672547d23386fd5666917b3a1cb69f';
export const transaction2Signature1 =
  '802ac030548f5c4e05f071d110f96ca0d18d61dcad93638973d15ab454c7ab9855338130212ce38c26a4f595cbaab4dfd86057827f17f141dbdb2f3f6ff8908f';
export const transaction2SignedTxBytesHex =
  '70736274ff01009a0200000002193a28a12c8be889390e48b30cf9c65096f3f51bc04c2475557096d0cfca4f220100000000ffffffffd2e6232676e35e104927f22d4c90bc367c684209a4937664bad886227cd95c4b0100000000ffffffff028063ef2700000000160014828037cbcbed02c6d9948e51b89c44da3a3b81fcaff9e08a00000000160014fdfe06abec6a565eff3604db30fd30069b2f2a28000000000001011f00ca9a3b00000000160014fdfe06abec6a565eff3604db30fd30069b2f2a2801086b02473044022022140681b4b7d5a099cb427a0bf0cd3085ecfd583c9908891058a84def1ab8a2022038e202c53ab6f52776166218353984dbee87ffa5979e72bf2ebf731eadb3009301210345307e1165c99d12557bea11f8c8cd0f6bc057fb51952e824bc7c760fda073350001011f0094357700000000160014fdfe06abec6a565eff3604db30fd30069b2f2a2801086c02483045022100802ac030548f5c4e05f071d110f96ca0d18d61dcad93638973d15ab454c7ab98022055338130212ce38c26a4f595cbaab4dfd86057827f17f141dbdb2f3f6ff8908f01210345307e1165c99d12557bea11f8c8cd0f6bc057fb51952e824bc7c760fda07335000000';
export const transaction2BoxMapping = [
  {
    inputId:
      '224fcacfd096705575244cc01bf5f39650c6f90cb3480e3989e88b2ca1283a19.1',
    serializedOutput:
      '{"txId":"5bc486302164841b32bdfa03f510590109e3520d0a0aa6a15edfea0c8e33a080","index":1,"value":2329999791}',
  },
  {
    inputId:
      '4b5cd97c2286d8ba647693a40942687c36bc904c2df22749105ee3762623e6d2.1',
    serializedOutput:
      '{"txId":"5bc486302164841b32bdfa03f510590109e3520d0a0aa6a15edfea0c8e33a080","index":1,"value":2329999791}',
  },
];

export const lockAddress = 'DHTom1rFwsgAn5raKU1nok8E5MdQ4GBkAN';
export const lockAddressPublicKey =
  '022b9ed0a9139042921decc62603a4a07357b444da2e0bd6a96c27155117913037';
export const lockUtxo = {
  txId: 'f1ac0a7ce8a45aa53ac245ea2178592f708c9ef38bee0a5bd88c9f08d47ce493',
  index: 1,
  scriptPubKey:
    '0345307e1165c99d12557bea11f8c8cd0f6bc057fb51952e824bc7c760fda07335',
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

// Add additional events and data from Bitcoin testData
export const invalidEvent: EventTrigger = {
  height: 300,
  fromChain: 'dogecoin',
  toChain: 'ergo',
  fromAddress: 'fromAddress',
  toAddress: 'toAddress',
  amount: '5500',
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

export const validEventWithHighFee: EventTrigger = {
  height: 300,
  fromChain: 'dogecoin',
  toChain: 'ergo',
  fromAddress: 'fromAddress',
  toAddress: 'toAddress',
  amount: '1000000',
  bridgeFee: '1000',
  networkFee: '900000',
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

export const dogecoinTx1 = {
  id: '6a1b9e7a755afb5d82ecaa5f432d51bd23e452ee1031fc99066e92788a075a84',
  inputs: [
    {
      txId: 'eff4900465d1603d12c1dc8f231a07ce2196c04196aa26bb80147bb152137aaf',
      index: 0,
      scriptPubKey: '0014bf1916dc33dbdd65f60d8b1f65eb35e8120835fc',
    },
  ],
  outputs: [
    {
      scriptPubKey:
        '6a4c3300000000007554fc820000000000962f582103f999da8e6e42660e4464d17d29e63bc006734a6710a24eb489b466323d3a9339',
      value: 0n,
    },
    {
      scriptPubKey:
        '0345307e1165c99d12557bea11f8c8cd0f6bc057fb51952e824bc7c760fda07335',
      value: 3000000000n,
    },
  ],
};

export const lockAddressUtxos = [
  {
    txId: '224fcacfd096705575244cc01bf5f39650c6f90cb3480e3989e88b2ca1283a19',
    index: 1,
    scriptPubKey:
      '0345307e1165c99d12557bea11f8c8cd0f6bc057fb51952e824bc7c760fda07335',
    txHex:
      '02000000015de5e7ecd6c60bf37591d4c23a6747644040b71edbe209231542c848c7ef737f020000006a473044022069ef1e50e6cd355179f68cdf42e7f68ff442a005b4906f40aa846d945208eaf1022037ce2ecc0c294eb46f875bac50edffbe610247a2769c5dc2ad8e8f18f6155daf0121022b9ed0a9139042921decc62603a4a07357b444da2e0bd6a96c27155117913037ffffffff030000000000000000356a33000000000005f5e10000000000009896802103e5bedab3f782ef17a73e9bdc41ee0e18c3ab477400f35bcf7caa54171db7ff3600e1f505000000001976a9145d0e02100e393220f90ffce4485f809de4ff777c88acc82944d3020000001976a914872b67c8270a9eaf5c2abf632af3dea989d2e37188ac00000000',
    value: 1000000000n,
  },
  {
    txId: '4b5cd97c2286d8ba647693a40942687c36bc904c2df22749105ee3762623e6d2',
    index: 1,
    scriptPubKey:
      '0345307e1165c99d12557bea11f8c8cd0f6bc057fb51952e824bc7c760fda07335',
    txHex:
      '02000000015de5e7ecd6c60bf37591d4c23a6747644040b71edbe209231542c848c7ef737f020000006a473044022069ef1e50e6cd355179f68cdf42e7f68ff442a005b4906f40aa846d945208eaf1022037ce2ecc0c294eb46f875bac50edffbe610247a2769c5dc2ad8e8f18f6155daf0121022b9ed0a9139042921decc62603a4a07357b444da2e0bd6a96c27155117913037ffffffff030000000000000000356a33000000000005f5e10000000000009896802103e5bedab3f782ef17a73e9bdc41ee0e18c3ab477400f35bcf7caa54171db7ff3600e1f505000000001976a9145d0e02100e393220f90ffce4485f809de4ff777c88acc82944d3020000001976a914872b67c8270a9eaf5c2abf632af3dea989d2e37188ac00000000',
    value: 2000000000n,
  },
];
