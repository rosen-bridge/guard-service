import testUtils from '../../../testUtils/TestUtils';
import TestUtils from '../../../testUtils/TestUtils';
import ChainsConstants from '../../../../src/chains/ChainsConstants';

class TestData {
  static mockTxUtxo = (
    txId: string,
    boxesLen: number,
    boxAddr: string
  ): string => {
    const mockUtxos = (boxesLen: number, boxAddr: string): string => {
      const boxes: string[] = [];
      for (let i = 0; i < boxesLen; i++)
        boxes.push(`{
                "address": "${boxAddr}",
                "amount": [
                    {
                        "unit": "lovelace",
                        "quantity": "6000000"
                    }
                ],
                "output_index": ${i},
                "collateral": false,
                "data_hash": null,
                "inline_datum": null,
                "reference_script_hash": null
            }`);
      return boxes.join(',');
    };

    return `{
            "hash": "${txId}",
            "inputs": [
                {
                    "address": "",
                    "amount": [
                        {
                            "unit": "lovelace",
                            "quantity": "1000000000"
                        }
                    ],
                    "tx_hash": "${testUtils.generateRandomId()}",
                    "output_index": 0,
                    "collateral": false,
                    "data_hash": null,
                    "inline_datum": null,
                    "reference_script_hash": null,
                    "reference": false
                }
            ],
            "outputs": [
                ${mockUtxos(boxesLen, boxAddr)}
            ]
        }`;
  };

  static mockAddressUtxo = (boxTxs: string[], boxIndexes: number[]): string => {
    const mockUtxo = (txId: string, txIndex: number): string => {
      return `{
                "tx_hash": "${txId}",
                "tx_index": ${txIndex},
                "output_index": ${txIndex},
                "amount": [
                    {
                        "unit": "lovelace",
                        "quantity": "1500000"
                    }
                ],
                "block": "${TestUtils.generateRandomId()}",
                "data_hash": null,
                "inline_datum": null,
                "reference_script_hash": null
            }`;
    };

    const boxes: string[] = [];
    for (let i = 0; i < boxTxs.length; i++)
      boxes.push(mockUtxo(boxTxs[i], boxIndexes[i]));

    return `[
            ${boxes.join(',')}
        ]`;
  };

  static adaPaymentTransaction = (eventId: string): string => {
    return `{
            "network": "${ChainsConstants.cardano}",
            "txId": "0f5ace462cf496b32c4f05a051e8a9bee2f4d6c95087e77cb6170f27d55752d0",
            "eventId": "${eventId}",
            "txBytes": "84a400838258209e8d19d54c2850f702039eeed1f27f7c2756171512ea25ac5aaae8102ec2677f0082582066a177cf4f070f85b54785e7a93fb76710f84caa7e14d2711eebe8a050db2af200825820631114d5565c3abb0a893e70aadf043dc0868ecaf29e038ac949883a2a7cccc402018282583900271c90846c04b24ed652626ade0915756f813a34f015676556d0b8816c60bd37151b14e7aa22b680c6961057151569e23b019a4276be40941a02faf08082583900f75bf4c647e94b0057086306f4f72f8a8336b8ec171abd8fcdde1a80418b2d81de40eb185e0a0c01f5b47dd3764e609fc088d8766695b760821a055a3d40a2581c7eae28af2208be856f7a119668ae52a49b73725e326dc16579dcc373a1401864581c7eae28af2208be856f7a119668ae52a49b73725e326dc16579dcc37ea140185f021a00030d40031a0089f094a0f5f6",
            "txType": "payment"
        }`;
  };

  static tllPastAssetPaymentTx = (eventId: string): string => {
    return `{
            "network": "${ChainsConstants.cardano}",
            "txId": "a85c4944301fdd1b1adf13bd2aef8588079927b4a466b7097fdbc18ce1502053",
            "eventId": "${eventId}",
            "txBytes": "84a40083825820ccbed2ea51a99add35111213ece43fc34e086515478fe0cce7c6d86f2c97f76200825820194ed56ae4c55b2bdc32e6a8e421fbed39a1b036e2ce8f0520502259e0eee4aa008258205411f24ada5eaa748bd808f7e045e67b410e22872ff2e3cb953a55031c8cc6d902018282583900271c90846c04b24ed652626ade0915756f813a34f015676556d0b8816c60bd37151b14e7aa22b680c6961057151569e23b019a4276be4094821a00172698a1581c7eae28af2208be856f7a119668ae52a49b73725e326dc16579dcc37ea140184182583900f75bf4c647e94b0057086306f4f72f8a8336b8ec171abd8fcdde1a80418b2d81de40eb185e0a0c01f5b47dd3764e609fc088d8766695b760821a083e0728a2581c7eae28af2208be856f7a119668ae52a49b73725e326dc16579dcc373a1401864581c7eae28af2208be856f7a119668ae52a49b73725e326dc16579dcc37ea140181e021a00030d40031a007aae4aa0f5f6",
            "txType": "payment"
        }`;
  };

  static observationTxInfo = {
    tx_hash: '928052b80bfc23801da525a6bf8f805da36f22fa0fd5fec2198b0746eb82b72b',
    block_hash:
      'f75fea40852ed7d7f539d008e45255725daef8553ae7162750836f279570813a',
    block_height: 3338631,
    epoch: 188,
    epoch_slot: 250266,
    absolute_slot: 51096666,
    tx_timestamp: 1645465882,
    tx_block_index: 0,
    tx_size: 665,
    total_output: '53796752',
    fee: '184861',
    deposit: '0',
    invalid_before: null,
    invalid_after: null,
    collaterals: [],
    inputs: [
      {
        payment_addr: {
          bech32:
            'addr_test1qzf9uxs6xgprx4zt20qtsasxut8uw6quv34xlkmd26yuk5xe70s0yf5c3sefnrft6gdajkpz29t8lsn0kcr5xqsf34qqxd6n4f',
          cred: '925e1a1a320233544b53c0b87606e2cfc7681c646a6fdb6d5689cb50',
        },
        stake_addr:
          'stake_test1urvl8c8jy6vgcv5e354ayx7etq39z4nlcfhmvp6rqgyc6sqpdzt63',
        tx_hash:
          'c37fa6d7147eeca2838f4312491dd75ac5b7c5dc5d784ff741afd797a46f7536',
        tx_index: 2,
        value: '51981613',
        asset_list: [
          {
            policy_id:
              'b07de2ce2a86f890410d4504d491b1df423f7e3e20973663a819d1a1',
            asset_name: '455448',
            quantity: '13060',
          },
        ],
      },
      {
        payment_addr: {
          bech32:
            'addr_test1qzf9uxs6xgprx4zt20qtsasxut8uw6quv34xlkmd26yuk5xe70s0yf5c3sefnrft6gdajkpz29t8lsn0kcr5xqsf34qqxd6n4f',
          cred: '925e1a1a320233544b53c0b87606e2cfc7681c646a6fdb6d5689cb50',
        },
        stake_addr:
          'stake_test1urvl8c8jy6vgcv5e354ayx7etq39z4nlcfhmvp6rqgyc6sqpdzt63',
        tx_hash:
          'd9f8f52825238a17f802bc54831bbdb10f427b2f20f8cf8c3613f710e59615e5',
        tx_index: 7,
        value: '2000000',
        asset_list: [
          {
            policy_id:
              '22c3b86a5b88a78b5de52f4aed2831d1483b3b7681f1ee2569538130',
            asset_name:
              '016dee4ce565a31af501894406ec61d78a87f0c53de1e7cc6d52d156b3f5b155',
            quantity: '15829495',
          },
        ],
      },
    ],
    outputs: [
      {
        payment_addr: {
          bech32:
            'addr_test1vze7yqqlg8cjlyhz7jzvsg0f3fhxpuu6m3llxrajfzqecggw704re',
          cred: '925e1a1a320233544b53c0b87606e2cfc7681c646a6fdb6d5689cb50',
        },
        stake_addr:
          'stake_test1urvl8c8jy6vgcv5e354ayx7etq39z4nlcfhmvp6rqgyc6sqpdzt63',
        tx_hash:
          '928052b80bfc23801da525a6bf8f805da36f22fa0fd5fec2198b0746eb82b72b',
        tx_index: 1,
        value: '49796752',
        asset_list: [
          {
            policy_id:
              'ace7bcc2ce705679149746620de3a84660ce57573df54b5a096e39a2',
            asset_name: '7369676d61',
            quantity: '13060',
          },
        ],
      },
      {
        payment_addr: {
          bech32:
            'addr_test1wphyve8r76kvfr5yn6k0fcmq0mn2uf6c6mvtsrafmr7awcg0vnzpg',
          cred: '6e4664e3f6acc48e849eacf4e3607ee6ae2758d6d8b80fa9d8fdd761',
        },
        stake_addr: null,
        tx_hash:
          '928052b80bfc23801da525a6bf8f805da36f22fa0fd5fec2198b0746eb82b72b',
        tx_index: 0,
        value: '4000000',
        asset_list: [
          {
            policy_id:
              '22c3b86a5b88a78b5de52f4aed2831d1483b3b7681f1ee2569538130',
            asset_name:
              '016dee4ce565a31af501894406ec61d78a87f0c53de1e7cc6d52d156b3f5b155',
            quantity: '15829495',
          },
        ],
      },
    ],
    withdrawals: [],
    assets_minted: [],
    metadata: {
      '0': JSON.parse(`{
                    "to": "ergo",
                    "bridgeFee": "250",
                    "networkFee": "10000",
                    "toAddress": "ergoAddress",
                    "targetChainTokenId": "cardanoTokenId",
                    "fromAddress": [
                      "addr_test1qzf9uxs6xgprx4zt20qtsasxut8uw6quv34xlkmd26yuk",
                      "5xe70s0yf5c3sefnrft6gdajkpz29t8lsn0kcr5xqsf34qqxd6n4f"
                    ]
                }`),
    },
    certificates: [],
    native_scripts: [],
    plutus_contracts: [],
  };

  static adaObservationTxInfo = {
    tx_hash: '00ee077854471a04fbef18a5a971b50fb39f52fc6f6b3b8d0682ce2c48f6ebef',
    block_hash:
      'f75fea40852ed7d7f539d008e45255725daef8553ae7162750836f279570813a',
    block_height: 3338631,
    epoch: 188,
    epoch_slot: 250266,
    absolute_slot: 51096666,
    tx_timestamp: 1645465882,
    tx_block_index: 0,
    tx_size: 665,
    total_output: '53796752',
    fee: '184861',
    deposit: '0',
    invalid_before: null,
    invalid_after: null,
    collaterals: [],
    inputs: [
      {
        payment_addr: {
          bech32:
            'addr_test1qzf9uxs6xgprx4zt20qtsasxut8uw6quv34xlkmd26yuk5xe70s0yf5c3sefnrft6gdajkpz29t8lsn0kcr5xqsf34qqxd6n4f',
          cred: '925e1a1a320233544b53c0b87606e2cfc7681c646a6fdb6d5689cb50',
        },
        stake_addr:
          'stake_test1urvl8c8jy6vgcv5e354ayx7etq39z4nlcfhmvp6rqgyc6sqpdzt63',
        tx_hash:
          'c37fa6d7147eeca2838f4312491dd75ac5b7c5dc5d784ff741afd797a46f7536',
        tx_index: 2,
        value: '51981613',
        asset_list: [
          {
            policy_id:
              'b07de2ce2a86f890410d4504d491b1df423f7e3e20973663a819d1a1',
            asset_name: '455448',
            quantity: '13060',
          },
        ],
      },
      {
        payment_addr: {
          bech32:
            'addr_test1qzf9uxs6xgprx4zt20qtsasxut8uw6quv34xlkmd26yuk5xe70s0yf5c3sefnrft6gdajkpz29t8lsn0kcr5xqsf34qqxd6n4f',
          cred: '925e1a1a320233544b53c0b87606e2cfc7681c646a6fdb6d5689cb50',
        },
        stake_addr:
          'stake_test1urvl8c8jy6vgcv5e354ayx7etq39z4nlcfhmvp6rqgyc6sqpdzt63',
        tx_hash:
          'd9f8f52825238a17f802bc54831bbdb10f427b2f20f8cf8c3613f710e59615e5',
        tx_index: 7,
        value: '2000000',
        asset_list: [
          {
            policy_id:
              '22c3b86a5b88a78b5de52f4aed2831d1483b3b7681f1ee2569538130',
            asset_name:
              '016dee4ce565a31af501894406ec61d78a87f0c53de1e7cc6d52d156b3f5b155',
            quantity: '15829495',
          },
        ],
      },
    ],
    outputs: [
      {
        payment_addr: {
          bech32:
            'addr_test1vze7yqqlg8cjlyhz7jzvsg0f3fhxpuu6m3llxrajfzqecggw704re',
          cred: '925e1a1a320233544b53c0b87606e2cfc7681c646a6fdb6d5689cb50',
        },
        stake_addr:
          'stake_test1urvl8c8jy6vgcv5e354ayx7etq39z4nlcfhmvp6rqgyc6sqpdzt63',
        tx_hash:
          '928052b80bfc23801da525a6bf8f805da36f22fa0fd5fec2198b0746eb82b72b',
        tx_index: 1,
        value: '49796752',
        asset_list: [],
      },
      {
        payment_addr: {
          bech32:
            'addr_test1wphyve8r76kvfr5yn6k0fcmq0mn2uf6c6mvtsrafmr7awcg0vnzpg',
          cred: '6e4664e3f6acc48e849eacf4e3607ee6ae2758d6d8b80fa9d8fdd761',
        },
        stake_addr: null,
        tx_hash:
          '928052b80bfc23801da525a6bf8f805da36f22fa0fd5fec2198b0746eb82b72b',
        tx_index: 0,
        value: '4000000',
        asset_list: [
          {
            policy_id:
              '22c3b86a5b88a78b5de52f4aed2831d1483b3b7681f1ee2569538130',
            asset_name:
              '016dee4ce565a31af501894406ec61d78a87f0c53de1e7cc6d52d156b3f5b155',
            quantity: '15829495',
          },
        ],
      },
    ],
    withdrawals: [],
    assets_minted: [],
    metadata: {
      '0': JSON.parse(`{
                    "to": "ergo",
                    "bridgeFee": "250",
                    "networkFee": "10000",
                    "toAddress": "ergoAddress",
                    "targetChainTokenId": "cardanoTokenId",
                    "fromAddress": [
                      "addr_test1qzf9uxs6xgprx4zt20qtsasxut8uw6quv34xlkmd26yuk",
                      "5xe70s0yf5c3sefnrft6gdajkpz29t8lsn0kcr5xqsf34qqxd6n4f"
                    ]
                }`),
    },
    certificates: [],
    native_scripts: [],
    plutus_contracts: [],
  };

  static nonObservationTxInfo = {
    tx_hash: '0f32ad374daefdce563e3391effc4fc42eb0e74bbec8afe16a46eeea69e3b2aa',
    block_hash:
      'f75fea40852ed7d7f539d008e45255725daef8553ae7162750836f279570813a',
    inputs: [],
    outputs: [
      {
        payment_addr: {
          bech32:
            'addr_test1wphyve8r76kvfr5yn6k0fcmq0mn2uf6c6mvtsrafmr7awcg0vnzpg',
          cred: '6e4664e3f6acc48e849eacf4e3607ee6ae2758d6d8b80fa9d8fdd761',
        },
        stake_addr: null,
        tx_hash:
          '928052b80bfc23801da525a6bf8f805da36f22fa0fd5fec2198b0746eb82b72b',
        tx_index: 0,
        value: '4000000',
        asset_list: [
          {
            policy_id:
              '22c3b86a5b88a78b5de52f4aed2831d1483b3b7681f1ee2569538130',
            asset_name:
              '016dee4ce565a31af501894406ec61d78a87f0c53de1e7cc6d52d156b3f5b155',
            quantity: '15829495',
          },
        ],
      },
    ],
  };

  static noMetadataTxInfo = {
    tx_hash: '028052b80bfc23801da525a6bf8f805da36f22fa0fd5fec2198b0746eb82b72b',
    block_hash:
      'f75fea40852ed7d7f539d008e45255725daef8553ae7162750836f279570813a',
    inputs: [],
    outputs: [
      {
        payment_addr: {
          bech32:
            'addr_test1vze7yqqlg8cjlyhz7jzvsg0f3fhxpuu6m3llxrajfzqecggw704re',
          cred: '925e1a1a320233544b53c0b87606e2cfc7681c646a6fdb6d5689cb50',
        },
        stake_addr:
          'stake_test1urvl8c8jy6vgcv5e354ayx7etq39z4nlcfhmvp6rqgyc6sqpdzt63',
        tx_hash:
          '928052b80bfc23801da525a6bf8f805da36f22fa0fd5fec2198b0746eb82b72b',
        tx_index: 1,
        value: '49796752',
        asset_list: [
          {
            policy_id:
              'ace7bcc2ce705679149746620de3a84660ce57573df54b5a096e39a2',
            asset_name: '7369676d61',
            quantity: '13060',
          },
        ],
      },
    ],
  };

  static fakeTokenObservationTxInfo = {
    tx_hash: '128052b80bfc23801da525a6bf8f805da36f22fa0fd5fec2198b0746eb82b72b',
    block_hash:
      'f75fea40852ed7d7f539d008e45255725daef8553ae7162750836f279570813a',
    inputs: [],
    outputs: [
      {
        payment_addr: {
          bech32:
            'addr_test1vze7yqqlg8cjlyhz7jzvsg0f3fhxpuu6m3llxrajfzqecggw704re',
          cred: '925e1a1a320233544b53c0b87606e2cfc7681c646a6fdb6d5689cb50',
        },
        stake_addr:
          'stake_test1urvl8c8jy6vgcv5e354ayx7etq39z4nlcfhmvp6rqgyc6sqpdzt63',
        tx_hash:
          '928052b80bfc23801da525a6bf8f805da36f22fa0fd5fec2198b0746eb82b72b',
        tx_index: 1,
        value: '49796752',
        asset_list: [
          {
            policy_id:
              'ace7bcc2ce705679149746620de3a84660ce57573df54b5a096e39a2',
            asset_name: '1369676d60',
            quantity: '13060',
          },
        ],
      },
    ],
    metadata: {
      '0': JSON.parse(`{
                    "to": "ergo",
                    "bridgeFee": "250",
                    "networkFee": "10000",
                    "toAddress": "ergoAddress",
                    "targetChainTokenId": "cardanoTokenId"
                }`),
    },
  };
}

export default TestData;
