import {
  AssetBalance,
  EventTrigger,
  PaymentOrder,
} from '@rosen-chains/abstract-chain';
import { CardanoTx } from '../lib';
import { RosenTokens } from '@rosen-bridge/tokens';

export const testTokenMap: RosenTokens = [
  {
    ergo: {
      tokenId: 'erg',
      name: 'ERG',
      decimals: 9,
      type: 'ERG',
      residency: 'native',
    },
    cardano: {
      tokenId:
        'ef6aa6200e21634e58ce6796b4b61d1d7d059d2ebe93c2996eeaf286.5273744552477654657374',
      name: 'RstERGvTest',
      policyId: 'ef6aa6200e21634e58ce6796b4b61d1d7d059d2ebe93c2996eeaf286',
      assetName: '5273744552477654657374',
      decimals: 9,
      type: 'native',
      residency: 'wrapped',
    },
  },
  {
    ergo: {
      tokenId:
        '4ed6449240d166b0e44c529b5bf06d210796473d3811b9aa0e15329599164c24',
      name: 'RST-ADA.V-test',
      decimals: 6,
      type: 'EIP-004',
      residency: 'wrapped',
    },
    cardano: {
      tokenId: 'ada',
      name: 'ADA',
      policyId: '',
      assetName: '414441',
      decimals: 6,
      type: 'ADA',
      residency: 'native',
    },
  },
  {
    ergo: {
      tokenId:
        'c59e86ef9d0280de582d6266add18fca339a77dfb321268e83033fe47101dc4d',
      name: 'RST-Cardano-Token.V-test',
      decimals: 4,
      type: 'EIP-004',
      residency: 'wrapped',
    },
    cardano: {
      tokenId:
        'cfd784ccfe5fe8ce7d09f4ddb65624378cc8022bf3ec240cf41ea6be.43617264616e6f546f6b656e7654657374',
      name: 'CardanoTokenvTest',
      policyId: 'cfd784ccfe5fe8ce7d09f4ddb65624378cc8022bf3ec240cf41ea6be',
      assetName: '43617264616e6f546f6b656e7654657374',
      decimals: 4,
      type: 'native',
      residency: 'native',
    },
  },
  {
    ergo: {
      tokenId:
        'a1143e81c5ab485a807e6f0f76af1dd70cc5359b29e0b1229d0edfe490d33b67',
      name: 'Ergo-Token.V-test',
      decimals: 4,
      type: 'EIP-004',
      residency: 'native',
    },
    cardano: {
      tokenId:
        '48d4a14b8407af8407702df3afda4cc8a945ce55235e9808c62c5f9b.5273744572676f546f6b656e7654657374',
      name: 'RstErgoTokenvTest',
      policyId: '48d4a14b8407af8407702df3afda4cc8a945ce55235e9808c62c5f9b',
      assetName: '5273744572676f546f6b656e7654657374',
      decimals: 4,
      type: 'native',
      residency: 'wrapped',
    },
  },
];
export const multiDecimalTokenMap: RosenTokens = [
  {
    ergo: {
      tokenId: 'erg',
      name: 'erg',
      decimals: 9,
      type: 'ERG',
      residency: 'native',
    },
    cardano: {
      tokenId:
        'ef6aa6200e21634e58ce6796b4b61d1d7d059d2ebe93c2996eeaf286.5273744552477654657374',
      name: 'RstERGvTest',
      policyId: 'ef6aa6200e21634e58ce6796b4b61d1d7d059d2ebe93c2996eeaf286',
      assetName: '5273744552477654657374',
      decimals: 10,
      type: 'native',
      residency: 'wrapped',
    },
  },
  {
    ergo: {
      tokenId:
        '4ed6449240d166b0e44c529b5bf06d210796473d3811b9aa0e15329599164c24',
      name: 'RST-ADA.V-test',
      decimals: 4,
      type: 'EIP-004',
      residency: 'wrapped',
    },
    cardano: {
      tokenId: 'ada',
      name: 'ADA',
      policyId: '',
      assetName: '414441',
      decimals: 6,
      type: 'ADA',
      residency: 'native',
    },
  },
  {
    ergo: {
      tokenId:
        'c59e86ef9d0280de582d6266add18fca339a77dfb321268e83033fe47101dc4d',
      name: 'RST-Cardano-Token.V-test',
      decimals: 4,
      type: 'EIP-004',
      residency: 'wrapped',
    },
    cardano: {
      tokenId:
        'cfd784ccfe5fe8ce7d09f4ddb65624378cc8022bf3ec240cf41ea6be.43617264616e6f546f6b656e7654657374',
      name: 'CardanoTokenvTest',
      policyId: 'cfd784ccfe5fe8ce7d09f4ddb65624378cc8022bf3ec240cf41ea6be',
      assetName: '43617264616e6f546f6b656e7654657374',
      decimals: 5,
      type: 'native',
      residency: 'native',
    },
  },
  {
    ergo: {
      tokenId:
        'a1143e81c5ab485a807e6f0f76af1dd70cc5359b29e0b1229d0edfe490d33b67',
      name: 'Ergo-Token.V-test',
      decimals: 4,
      type: 'EIP-004',
      residency: 'native',
    },
    cardano: {
      tokenId:
        '48d4a14b8407af8407702df3afda4cc8a945ce55235e9808c62c5f9b.5273744572676f546f6b656e7654657374',
      name: 'RstErgoTokenvTest',
      policyId: '48d4a14b8407af8407702df3afda4cc8a945ce55235e9808c62c5f9b',
      assetName: '5273744572676f546f6b656e7654657374',
      decimals: 1,
      type: 'native',
      residency: 'wrapped',
    },
  },
];

export const transaction1 = `
{
  "body": {
    "inputs": [
      {
        "transaction_id": "3101943d053d487d78578f230518bd7068ad166d1b1b63488ec822cdcff143a8",
        "index": 0
      },
      {
        "transaction_id": "a878d4560455eff78e9e81721743473b40d55898cb3162dd643d4c4821e05803",
        "index": 0
      },
      {
        "transaction_id": "b2e02269dba680b63f4ac4dfa9f5c967bc208af685709ab9cc2228839547ae52",
        "index": 0
      },
      {
        "transaction_id": "bd391046e9cdb40592eae98e2bb65abf75756ae21b4011044b883e7799c68a33",
        "index": 2
      }
    ],
    "outputs": [
      {
        "address": "addr1qxwxpafgqasnddk8et6en0vn74awg4j0n2nfek6e62aywvgcwedk5s2s92dx7msutk33zsl92uh8uhahh305nz7pekjsz5l37w",
        "amount": {
          "coin": "2000000",
          "multiasset": {
            "ef6aa6200e21634e58ce6796b4b61d1d7d059d2ebe93c2996eeaf286": {
              "5273744552477654657374": "100"
            }
          }
        },
        "plutus_data": null,
        "script_ref": null
      },
      {
        "address": "addr1qxwkc9uhw02wvkgw9qkrw2twescuc2ss53t5yaedl0zcyen2a0y7redvgjx0t0al56q9dkyzw095eh8jw7luan2kh38qpw3xgs",
        "amount": {
          "coin": "137010000",
          "multiasset": {
            "48d4a14b8407af8407702df3afda4cc8a945ce55235e9808c62c5f9b": {
              "5273744572676f546f6b656e7654657374": "5000"
            },
            "cfd784ccfe5fe8ce7d09f4ddb65624378cc8022bf3ec240cf41ea6be": {
              "43617264616e6f546f6b656e7654657374": "100"
            },
            "ef6aa6200e21634e58ce6796b4b61d1d7d059d2ebe93c2996eeaf286": {
              "5273744552477654657374": "900"
            }
          }
        },
        "plutus_data": null,
        "script_ref": null
      }
    ],
    "fee": "1000000",
    "ttl": "164",
    "certs": null,
    "withdrawals": null,
    "update": null,
    "auxiliary_data_hash": null,
    "validity_start_interval": null,
    "mint": null,
    "script_data_hash": null,
    "collateral": null,
    "required_signers": null,
    "network_id": null,
    "collateral_return": null,
    "total_collateral": null,
    "reference_inputs": null,
    "voting_procedures": null,
    "voting_proposals": null,
    "donation": null,
    "current_treasury_value": null
  },
  "witness_set": {
    "vkeys": null,
    "native_scripts": null,
    "bootstraps": null,
    "plutus_scripts": null,
    "plutus_data": null,
    "redeemers": null
  },
  "is_valid": true,
  "auxiliary_data": null
}
`;

export const transaction1InputIds = [
  '3101943d053d487d78578f230518bd7068ad166d1b1b63488ec822cdcff143a8.0',
  'a878d4560455eff78e9e81721743473b40d55898cb3162dd643d4c4821e05803.0',
  'b2e02269dba680b63f4ac4dfa9f5c967bc208af685709ab9cc2228839547ae52.0',
  'bd391046e9cdb40592eae98e2bb65abf75756ae21b4011044b883e7799c68a33.2',
];

export const transaction1BoxMapping = [
  {
    inputId:
      '3101943d053d487d78578f230518bd7068ad166d1b1b63488ec822cdcff143a8.0',
    serializedOutput:
      '{"address":"addr1qxwkc9uhw02wvkgw9qkrw2twescuc2ss53t5yaedl0zcyen2a0y7redvgjx0t0al56q9dkyzw095eh8jw7luan2kh38qpw3xgs","value":137010000,"assets":[{"asset_name":"5273744572676f546f6b656e7654657374","policy_id":"48d4a14b8407af8407702df3afda4cc8a945ce55235e9808c62c5f9b","quantity":5000},{"asset_name":"43617264616e6f546f6b656e7654657374","policy_id":"cfd784ccfe5fe8ce7d09f4ddb65624378cc8022bf3ec240cf41ea6be","quantity":100},{"asset_name":"5273744552477654657374","policy_id":"ef6aa6200e21634e58ce6796b4b61d1d7d059d2ebe93c2996eeaf286","quantity":900}]}',
  },
  {
    inputId:
      'a878d4560455eff78e9e81721743473b40d55898cb3162dd643d4c4821e05803.0',
    serializedOutput:
      '{"address":"addr1qxwkc9uhw02wvkgw9qkrw2twescuc2ss53t5yaedl0zcyen2a0y7redvgjx0t0al56q9dkyzw095eh8jw7luan2kh38qpw3xgs","value":137010000,"assets":[{"asset_name":"5273744572676f546f6b656e7654657374","policy_id":"48d4a14b8407af8407702df3afda4cc8a945ce55235e9808c62c5f9b","quantity":5000},{"asset_name":"43617264616e6f546f6b656e7654657374","policy_id":"cfd784ccfe5fe8ce7d09f4ddb65624378cc8022bf3ec240cf41ea6be","quantity":100},{"asset_name":"5273744552477654657374","policy_id":"ef6aa6200e21634e58ce6796b4b61d1d7d059d2ebe93c2996eeaf286","quantity":900}]}',
  },
  {
    inputId:
      'b2e02269dba680b63f4ac4dfa9f5c967bc208af685709ab9cc2228839547ae52.0',
    serializedOutput:
      '{"address":"addr1qxwkc9uhw02wvkgw9qkrw2twescuc2ss53t5yaedl0zcyen2a0y7redvgjx0t0al56q9dkyzw095eh8jw7luan2kh38qpw3xgs","value":137010000,"assets":[{"asset_name":"5273744572676f546f6b656e7654657374","policy_id":"48d4a14b8407af8407702df3afda4cc8a945ce55235e9808c62c5f9b","quantity":5000},{"asset_name":"43617264616e6f546f6b656e7654657374","policy_id":"cfd784ccfe5fe8ce7d09f4ddb65624378cc8022bf3ec240cf41ea6be","quantity":100},{"asset_name":"5273744552477654657374","policy_id":"ef6aa6200e21634e58ce6796b4b61d1d7d059d2ebe93c2996eeaf286","quantity":900}]}',
  },
  {
    inputId:
      'bd391046e9cdb40592eae98e2bb65abf75756ae21b4011044b883e7799c68a33.2',
    serializedOutput:
      '{"address":"addr1qxwkc9uhw02wvkgw9qkrw2twescuc2ss53t5yaedl0zcyen2a0y7redvgjx0t0al56q9dkyzw095eh8jw7luan2kh38qpw3xgs","value":137010000,"assets":[{"asset_name":"5273744572676f546f6b656e7654657374","policy_id":"48d4a14b8407af8407702df3afda4cc8a945ce55235e9808c62c5f9b","quantity":5000},{"asset_name":"43617264616e6f546f6b656e7654657374","policy_id":"cfd784ccfe5fe8ce7d09f4ddb65624378cc8022bf3ec240cf41ea6be","quantity":100},{"asset_name":"5273744552477654657374","policy_id":"ef6aa6200e21634e58ce6796b4b61d1d7d059d2ebe93c2996eeaf286","quantity":900}]}',
  },
];

export const transaction1Order: PaymentOrder = [
  {
    address:
      'addr1qxwxpafgqasnddk8et6en0vn74awg4j0n2nfek6e62aywvgcwedk5s2s92dx7msutk33zsl92uh8uhahh305nz7pekjsz5l37w',
    assets: {
      nativeToken: 2000000n,
      tokens: [
        {
          id: 'ef6aa6200e21634e58ce6796b4b61d1d7d059d2ebe93c2996eeaf286.5273744552477654657374',
          value: 100n,
        },
      ],
    },
  },
];
export const transaction1WrappedOrder: PaymentOrder = [
  {
    address:
      'addr1qxwxpafgqasnddk8et6en0vn74awg4j0n2nfek6e62aywvgcwedk5s2s92dx7msutk33zsl92uh8uhahh305nz7pekjsz5l37w',
    assets: {
      nativeToken: 20000n,
      tokens: [
        {
          id: 'ef6aa6200e21634e58ce6796b4b61d1d7d059d2ebe93c2996eeaf286.5273744552477654657374',
          value: 10n,
        },
      ],
    },
  },
];

export const transaction1PaymentTransaction = `
 {
   "network":"cardano",
   "eventId":"2bedc6e54ede7748e5efc7df689a0a89b281ac1d92d09054650d5f27a25d5b8a",
   "txBytes":"84a400d90102848258203101943d053d487d78578f230518bd7068ad166d1b1b63488ec822cdcff143a800825820a878d4560455eff78e9e81721743473b40d55898cb3162dd643d4c4821e0580300825820b2e02269dba680b63f4ac4dfa9f5c967bc208af685709ab9cc2228839547ae5200825820bd391046e9cdb40592eae98e2bb65abf75756ae21b4011044b883e7799c68a33020182825839019c60f528076136b6c7caf599bd93f57ae4564f9aa69cdb59d2ba473118765b6a41502a9a6f6e1c5da31143e5572e7e5fb7bc5f498bc1cda5821a001e8480a1581cef6aa6200e21634e58ce6796b4b61d1d7d059d2ebe93c2996eeaf286a14b52737445524776546573741864825839019d6c179773d4e6590e282c37296ecc31cc2a10a45742772dfbc582666aebc9e1e5ac448cf5bfbfa68056d88273cb4cdcf277bfcecd56bc4e821a082a9b50a3581c48d4a14b8407af8407702df3afda4cc8a945ce55235e9808c62c5f9ba1515273744572676f546f6b656e7654657374191388581ccfd784ccfe5fe8ce7d09f4ddb65624378cc8022bf3ec240cf41ea6bea15143617264616e6f546f6b656e76546573741864581cef6aa6200e21634e58ce6796b4b61d1d7d059d2ebe93c2996eeaf286a14b5273744552477654657374190384021a000f42400318a4a0f5f6",
   "txId":"e35e14cea4369e7d62a93e88ac5e792a1ad72f5a6fd8403f41e2a3df10400cc9",
   "txType":"payment",
   "inputUtxos": [
    "{\\"txId\\":\\"3101943d053d487d78578f230518bd7068ad166d1b1b63488ec822cdcff143a8\\",\\"index\\":0,\\"value\\":110002500,\\"assets\\":[{\\"policy_id\\":\\"ef6aa6200e21634e58ce6796b4b61d1d7d059d2ebe93c2996eeaf286\\",\\"asset_name\\":\\"5273744552477654657374\\",\\"quantity\\":1000}]}",
    "{\\"txId\\":\\"a878d4560455eff78e9e81721743473b40d55898cb3162dd643d4c4821e05803\\",\\"index\\":0,\\"value\\":10002500,\\"assets\\":[{\\"policy_id\\":\\"48d4a14b8407af8407702df3afda4cc8a945ce55235e9808c62c5f9b\\",\\"asset_name\\":\\"5273744572676f546f6b656e7654657374\\",\\"quantity\\":5000}]}",
    "{\\"txId\\":\\"b2e02269dba680b63f4ac4dfa9f5c967bc208af685709ab9cc2228839547ae52\\",\\"index\\":0,\\"value\\":10002500,\\"assets\\":[]}",
    "{\\"txId\\":\\"bd391046e9cdb40592eae98e2bb65abf75756ae21b4011044b883e7799c68a33\\",\\"index\\":2,\\"value\\":10002500,\\"assets\\":[{\\"policy_id\\":\\"cfd784ccfe5fe8ce7d09f4ddb65624378cc8022bf3ec240cf41ea6be\\",\\"asset_name\\":\\"43617264616e6f546f6b656e7654657374\\",\\"quantity\\":100}]}"
  ]
}
`;

export const transaction1Id =
  'e35e14cea4369e7d62a93e88ac5e792a1ad72f5a6fd8403f41e2a3df10400cc9';

export const transaction1Assets: AssetBalance = {
  nativeToken: 140010000n,
  tokens: [
    {
      id: 'ef6aa6200e21634e58ce6796b4b61d1d7d059d2ebe93c2996eeaf286.5273744552477654657374',
      value: 1000n,
    },
    {
      id: '48d4a14b8407af8407702df3afda4cc8a945ce55235e9808c62c5f9b.5273744572676f546f6b656e7654657374',
      value: 5000n,
    },
    {
      id: 'cfd784ccfe5fe8ce7d09f4ddb65624378cc8022bf3ec240cf41ea6be.43617264616e6f546f6b656e7654657374',
      value: 100n,
    },
  ],
};
export const transaction1WrappedAssets: AssetBalance = {
  nativeToken: 1400100n,
  tokens: [
    {
      id: 'ef6aa6200e21634e58ce6796b4b61d1d7d059d2ebe93c2996eeaf286.5273744552477654657374',
      value: 100n,
    },
    {
      id: '48d4a14b8407af8407702df3afda4cc8a945ce55235e9808c62c5f9b.5273744572676f546f6b656e7654657374',
      value: 5000n,
    },
    {
      id: 'cfd784ccfe5fe8ce7d09f4ddb65624378cc8022bf3ec240cf41ea6be.43617264616e6f546f6b656e7654657374',
      value: 10n,
    },
  ],
};

export const transaction1InputAssets: AssetBalance = {
  nativeToken: 140010000n,
  tokens: [
    {
      id: 'ef6aa6200e21634e58ce6796b4b61d1d7d059d2ebe93c2996eeaf286.5273744552477654657374',
      value: 1000n,
    },
    {
      id: '48d4a14b8407af8407702df3afda4cc8a945ce55235e9808c62c5f9b.5273744572676f546f6b656e7654657374',
      value: 5000n,
    },
    {
      id: 'cfd784ccfe5fe8ce7d09f4ddb65624378cc8022bf3ec240cf41ea6be.43617264616e6f546f6b656e7654657374',
      value: 100n,
    },
  ],
};
export const transaction1WrappedInputAssets: AssetBalance = {
  nativeToken: 1400100n,
  tokens: [
    {
      id: 'ef6aa6200e21634e58ce6796b4b61d1d7d059d2ebe93c2996eeaf286.5273744552477654657374',
      value: 100n,
    },
    {
      id: '48d4a14b8407af8407702df3afda4cc8a945ce55235e9808c62c5f9b.5273744572676f546f6b656e7654657374',
      value: 5000n,
    },
    {
      id: 'cfd784ccfe5fe8ce7d09f4ddb65624378cc8022bf3ec240cf41ea6be.43617264616e6f546f6b656e7654657374',
      value: 10n,
    },
  ],
};

export const transaction2PaymentTransaction = `
{
   "network":"cardano",
   "eventId":"2bedc6e54ede7748e5efc7df689a0a89b281ac1d92d09054650d5f27a25d5b8a",
   "txBytes":"84a400848258200ab4f0c9ef99a29f53ead0d351155e729727f694a8d339f3199a056d01e0641600825820579fd876a9f055b9d6d6ffa736fc23e1fc0643c97c833f579d8ab293d01748de008258209cf282b28f4b24d40fdb7faccf07ff85a65a6568dffd35167e4d4276c77b367900825820a86d298dc2273a58e97ae165ec90ebeea7693b3e51c84df38f658e4307c85b26020182825839019c60f528076136b6c7caf599bd93f57ae4564f9aa69cdb59d2ba473118765b6a41502a9a6f6e1c5da31143e5572e7e5fb7bc5f498bc1cda5821a001e8480a1581cef6aa6200e21634e58ce6796b4b61d1d7d059d2ebe93c2996eeaf286a14b52737445524776546573741864825839019d6c179773d4e6590e282c37296ecc31cc2a10a45742772dfbc582666aebc9e1e5ac448cf5bfbfa68056d88273cb4cdcf277bfcecd56bc4e821b112210f4b4f5ced0a3581c48d4a14b8407af8407702df3afda4cc8a945ce55235e9808c62c5f9ba1515273744572676f546f6b656e7654657374191388581ccfd784ccfe5fe8ce7d09f4ddb65624378cc8022bf3ec240cf41ea6bea15143617264616e6f546f6b656e76546573741864581cef6aa6200e21634e58ce6796b4b61d1d7d059d2ebe93c2996eeaf286a14b5273744552477654657374190384021a001e84800318a4a0f5f6",
   "txId":"d19cb7395cea03b2e248a2b3721351625bee90148f0bc3d776e83f8d8fd331a6",
   "txType":"payment"
}
`;

export const transaction3PaymentTransaction = `
{
   "network":"cardano",
   "eventId":"2bedc6e54ede7748e5efc7df689a0a89b281ac1d92d09054650d5f27a25d5b8a",
   "txBytes":"84a400848258209077052cf56f59eed45e4c9633c623b617a21a7f237c7736523af2a257b80f7c0082582099a6f39f0c50eb07bead2bec6f92536a037c9ccc7b9b1b1321ea496e33b44f0100825820d95bd9e2292a20268793a3303f8115570a87be94f28c85d59efb95266ebfc4b000825820ed4cc46becfe4d57b48c397653044aef739cfab53b7f71edb18f56964cdc4a51020182825839019c60f528076136b6c7caf599bd93f57ae4564f9aa69cdb59d2ba473118765b6a41502a9a6f6e1c5da31143e5572e7e5fb7bc5f498bc1cda5821a001e8480a1581cef6aa6200e21634e58ce6796b4b61d1d7d059d2ebe93c2996eeaf286a14b52737445524776546573741864825839019d6c179773d4e6590e282c37296ecc31cc2a10a45742772dfbc582666aebc9e1e5ac448cf5bfbfa68056d88273cb4cdcf277bfcecd56bc4e821b112210f4b5051110a3581c48d4a14b8407af8407702df3afda4cc8a945ce55235e9808c62c5f9ba1515273744572676f546f6b656e7654657374191388581ccfd784ccfe5fe8ce7d09f4ddb65624378cc8022bf3ec240cf41ea6bea15143617264616e6f546f6b656e7654657374182d581cef6aa6200e21634e58ce6796b4b61d1d7d059d2ebe93c2996eeaf286a14b5273744552477654657374190384021a000f42400318a4a0f5a100a1634f6e656354776f",
   "txId":"4131b9f7f1e77b984029d9d1f5ab7ef54689bc73f936f8d9cae202a8c54e9820",
   "txType":"payment"
}
`;

export const transaction4Order: PaymentOrder = [
  {
    address:
      'addr1qxwxpafgqasnddk8et6en0vn74awg4j0n2nfek6e62aywvgcwedk5s2s92dx7msutk33zsl92uh8uhahh305nz7pekjsz5l37w',
    assets: {
      nativeToken: 10000000n,
      tokens: [
        {
          id: 'ef6aa6200e21634e58ce6796b4b61d1d7d059d2ebe93c2996eeaf286.5273744552477654657374',
          value: 1000n,
        },
      ],
    },
  },
];
export const transaction4WrappedOrder: PaymentOrder = [
  {
    address:
      'addr1qxwxpafgqasnddk8et6en0vn74awg4j0n2nfek6e62aywvgcwedk5s2s92dx7msutk33zsl92uh8uhahh305nz7pekjsz5l37w',
    assets: {
      nativeToken: 100000n,
      tokens: [
        {
          id: 'ef6aa6200e21634e58ce6796b4b61d1d7d059d2ebe93c2996eeaf286.5273744552477654657374',
          value: 100n,
        },
      ],
    },
  },
];

export const transaction4PaymentTransaction = `
{
   "network":"cardano",
   "eventId":"2bedc6e54ede7748e5efc7df689a0a89b281ac1d92d09054650d5f27a25d5b85",
   "txBytes":"84a400838258202fdc94bb1a1d20233b0e2ac6fbd245ea23ea308a9cc0b118f1502c20608e8cea038258207825206824db48f1fb101426bac21a0cd277719d7c37229a2e6938539090599a00825820d7ff00bb5cbb9159711f10dfa36dd2f07855296e261e5a291bc98548549767ac020182825839019c60f528076136b6c7caf599bd93f57ae4564f9aa69cdb59d2ba473118765b6a41502a9a6f6e1c5da31143e5572e7e5fb7bc5f498bc1cda5821a00989680a1581cef6aa6200e21634e58ce6796b4b61d1d7d059d2ebe93c2996eeaf286a14b52737445524776546573741903e8825839019d6c179773d4e6590e282c37296ecc31cc2a10a45742772dfbc582666aebc9e1e5ac448cf5bfbfa68056d88273cb4cdcf277bfcecd56bc4e821a00897b50a1581c8e3e19131f96c186335b23bf7983ab00867a987ca900abb27ae0f2b9a2445253545018284452535457181e021a000f42400318a4a0f5f6",
   "txId":"044a030f9a05adc5ba08156c5d7d71fb85e8a8c94928cbadd52cce87f5d57712",
   "txType":"payment"
}
`;

export const transaction4ChangeBoxMultiAssets = `
{
  "8e3e19131f96c186335b23bf7983ab00867a987ca900abb27ae0f2b9": {
    "52535450": "40",
    "52535457": "30"
  }
}
`;

export const validEvent: EventTrigger = {
  height: 300,
  fromChain: 'cardano',
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

export const invalidEvent: EventTrigger = {
  height: 300,
  fromChain: 'cardano',
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
  fromChain: 'cardano',
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

export const cardanoTx1: CardanoTx = {
  id: 'c5afb967619ee64e0d724a56d27670fee6fe698df1375692d9868cb9792467c8',
  inputs: [
    {
      txId: 'faf9346ebeaf65c2720464eb9126e43dfd7b40742e337370b67b84ae0f03dc2b',
      index: 0,
      value: 3000000n,
      assets: [
        {
          policy_id: 'a0028f350aaabe0545fdcb56b039bfb08e4bb4d8c4d7c3c7d481c235',
          asset_name: '484f534b59',
          quantity: 184272501n,
        },
      ],
    },
  ],
  outputs: [
    {
      address:
        'addr1qxwxpafgqasnddk8et6en0vn74awg4j0n2nfek6e62aywvgcwedk5s2s92dx7msutk33zsl92uh8uhahh305nz7pekjsz5l37w',
      value: 1386445n,
      assets: [
        {
          policy_id: 'a0028f350aaabe0545fdcb56b039bfb08e4bb4d8c4d7c3c7d481c235',
          asset_name: '484f534b59',
          quantity: 184272501n,
        },
      ],
    },
    {
      address:
        'addr_test1vze7yqqlg8cjlyhz7jzvsg0f3fhxpuu6m3llxrajfzqecggw704re',
      value: 1344798n,
      assets: [],
    },
  ],
  fee: 268757n,
  metadata: {
    '0': {
      to: 'ergo',
      bridgeFee: '165000000',
      toAddress: '9g7mqqQAnUG4gWi6pFmic65ZfUrrWiVkMnbsg2hXUx6aVbBSTJ4',
      networkFee: '175000',
      fromAddress: [
        'addr1q9jperhqputlfnfqhteu6eu2xhjwxa9keph08vgrqjg357tthg3xm3n4r6p',
        'w85a5p6gdqv9v5zd6vmqdpxvl0jrql2aszjgvaj',
      ],
    },
  },
};

export const transaction5PaymentTransaction = `
{
  "network": "cardano",
  "eventId": "50d944ecfb8728b56ca42b3a3576e627677b9b5eccab5333977dfa25a0a27a28",
  "txBytes": "84a400d901028882582001137a617c09a36ed22334e7ed8c9b94eb222eb72dc148850e1425d8518c60bd008258200b61ef396b9b22421768445f2f27352366e3736514a3a5977fb678dddbdb83e800825820121e53cbe92d16fb5927f430502bcd0be4f44982b68725e0030f0250ec010de10082582015e590b8310eda5fbe7ca741e3c2bd8f0b2961f1dc4c5251cd43d5b85cadc17f008258201b4ca08ad9b4441abec1509324b184305c0b0c0dda92091a806deacaee3585fa00825820756fcffd0cc9517e9b93603de0a802cd124ecf85e7953ecbd2efa2736335294b008258207d729590af3934b4d4894111303bbc215d6dc5bce3ea2feb6ed1e7e7a8a271d900825820ed299711c6fe5b903eb6f43a5bc7d9c4558c69075d24e9ad2c85e911570d838200018282583901efb0d0521319e8783b467628ed83b3553e7b4f2ddc8803afef13abfaf11e8da94d421ace684733c5229af416879944516aa553c54cf0129d1a0123a48282581d616db0953f180e815d47f02b6b70ecdf5b16586e78dc064bb0d3083496821a018096e9a1581cfca58ef8ba9ef1961e132b611de2f8abcd2f34831e615a6f80c5bb48a34a546f6b656e2d6c6f656e1a0003fd754a77724552472d6c6f656e1b0000000228c1ae064a777252534e2d6c6f656e1a0115c44a021a00061a80031a068721c4a0f5f6",
  "txId": "445763d169a894871d2c5cc1920240eac9f52ba54c17d2236a12765b073f9ffd",
  "txType": "payment",
  "inputUtxos": [
    "{\\"txId\\":\\"01137a617c09a36ed22334e7ed8c9b94eb222eb72dc148850e1425d8518c60bd\\",\\"index\\":0,\\"value\\":1180940,\\"assets\\":[{\\"policy_id\\":\\"fca58ef8ba9ef1961e132b611de2f8abcd2f34831e615a6f80c5bb48\\",\\"asset_name\\":\\"777252534e2d6c6f656e\\",\\"quantity\\":7952200}]}",
    "{\\"txId\\":\\"0b61ef396b9b22421768445f2f27352366e3736514a3a5977fb678dddbdb83e8\\",\\"index\\":0,\\"value\\":1180940,\\"assets\\":[{\\"policy_id\\":\\"fca58ef8ba9ef1961e132b611de2f8abcd2f34831e615a6f80c5bb48\\",\\"asset_name\\":\\"777252534e2d6c6f656e\\",\\"quantity\\":6224894}]}",
    "{\\"txId\\":\\"121e53cbe92d16fb5927f430502bcd0be4f44982b68725e0030f0250ec010de1\\",\\"index\\":0,\\"value\\":1198180,\\"assets\\":[{\\"policy_id\\":\\"fca58ef8ba9ef1961e132b611de2f8abcd2f34831e615a6f80c5bb48\\",\\"asset_name\\":\\"77724552472d6c6f656e\\",\\"quantity\\":4306918719}]}",
    "{\\"txId\\":\\"15e590b8310eda5fbe7ca741e3c2bd8f0b2961f1dc4c5251cd43d5b85cadc17f\\",\\"index\\":0,\\"value\\":13364722,\\"assets\\":[]}",
    "{\\"txId\\":\\"1b4ca08ad9b4441abec1509324b184305c0b0c0dda92091a806deacaee3585fa\\",\\"index\\":0,\\"value\\":1198180,\\"assets\\":[{\\"policy_id\\":\\"fca58ef8ba9ef1961e132b611de2f8abcd2f34831e615a6f80c5bb48\\",\\"asset_name\\":\\"77724552472d6c6f656e\\",\\"quantity\\":4966797511}]}",
    "{\\"txId\\":\\"756fcffd0cc9517e9b93603de0a802cd124ecf85e7953ecbd2efa2736335294b\\",\\"index\\":0,\\"value\\":1180940,\\"assets\\":[{\\"policy_id\\":\\"fca58ef8ba9ef1961e132b611de2f8abcd2f34831e615a6f80c5bb48\\",\\"asset_name\\":\\"777252534e2d6c6f656e\\",\\"quantity\\":4026628}]}",
    "{\\"txId\\":\\"7d729590af3934b4d4894111303bbc215d6dc5bce3ea2feb6ed1e7e7a8a271d9\\",\\"index\\":0,\\"value\\":1180940,\\"assets\\":[{\\"policy_id\\":\\"fca58ef8ba9ef1961e132b611de2f8abcd2f34831e615a6f80c5bb48\\",\\"asset_name\\":\\"546f6b656e2d6c6f656e\\",\\"quantity\\":261493}]}",
    "{\\"txId\\":\\"ed299711c6fe5b903eb6f43a5bc7d9c4558c69075d24e9ad2c85e911570d8382\\",\\"index\\":0,\\"value\\":24232705,\\"assets\\":[]}"
  ]
}
`;

export const transaction6PaymentTransaction = `
{
  "network": "cardano",
  "eventId": "ececb5bf27e372aee4b6c65432935e2eb0285312507cb772cc41351c53785f0a",
  "txBytes": "84a40081825820b56b1dea42bc97a1186cf84f9311730a87d99355a54234679e40acec00111c3c0101828258390188acfdee735ac7f2ef2f887eb55ac5d1e9fb6550ca32d1c8c3fa9d0175f1d4c7297a02b4aab7505c3f16020e65952e4ef517c95da2e60be2821a002dc6c0a1581c04b95368393c821f180deee8229fbd941baaf9bd748ebcdbf7adbb14a145727352534e1a0096ad7182581d61ec0b8a9fb34c0d9c0bb4ebf434a9a9caf63e5aeb5924eed4b17bbe57821b00000001e8f50f7ea1581c04b95368393c821f180deee8229fbd941baaf9bd748ebcdbf7adbb14a24572734552471b000002444f78871045727352534e1a00020b63021a00061a80031a06b8cbada100818258205565c1c7a962d88e5e37754ae015fb96db11cca92719f6086fa7d8e514a9e65e5840fa9af840860e619eddfe80709d61e88c0289f9c5456047321264a146b6acfcbc12a013b4b88f2e175aa73ab1c53c38da3f43e67d7242ed07c17f6515e7bde608f5f6",
  "txId": "d6c74b0d597e68a4264dfc2e2c4e2429354c0fba2ca7d075ef9f8b53c01fad8a",
  "txType": "payment",
  "inputUtxos": [
    "{\\"txId\\":\\"b56b1dea42bc97a1186cf84f9311730a87d99355a54234679e40acec00111c3c\\",\\"index\\":1,\\"value\\":4103370847,\\"assets\\":[{\\"policy_id\\":\\"04b95368393c821f180deee8229fbd941baaf9bd748ebcdbf7adbb14\\",\\"asset_name\\":\\"7273455247\\",\\"quantity\\":1246207165320},{\\"policy_id\\":\\"04b95368393c821f180deee8229fbd941baaf9bd748ebcdbf7adbb14\\",\\"asset_name\\":\\"727352534e\\",\\"quantity\\":5004394}]}",
    "{\\"txId\\":\\"b56b1dea42bc97a1186cf84f9311730a87d99355a54234679e40acec00111c3c\\",\\"index\\":1,\\"value\\":4103370847,\\"assets\\":[{\\"policy_id\\":\\"04b95368393c821f180deee8229fbd941baaf9bd748ebcdbf7adbb14\\",\\"asset_name\\":\\"7273455247\\",\\"quantity\\":1246207165320},{\\"policy_id\\":\\"04b95368393c821f180deee8229fbd941baaf9bd748ebcdbf7adbb14\\",\\"asset_name\\":\\"727352534e\\",\\"quantity\\":5004394}]}"
  ]
}
`;

export const transaction6InputAssets: AssetBalance = {
  nativeToken: 4103370847n,
  tokens: [
    {
      id: '04b95368393c821f180deee8229fbd941baaf9bd748ebcdbf7adbb14.7273455247',
      value: 1246207165320n,
    },
    {
      id: '04b95368393c821f180deee8229fbd941baaf9bd748ebcdbf7adbb14.727352534e',
      value: 5004394n,
    },
  ],
};

export const transaction7PaymentTransaction = `
{
  "network": "cardano",
  "eventId": "",
  "txBytes": "",
  "txId": "06c74b0d597e68a4264dfc2e2c4e2429354c0fba2ca7d075ef9f8b53c01fad8a",
  "txType": "payment",
  "inputUtxos": []
}
`;
