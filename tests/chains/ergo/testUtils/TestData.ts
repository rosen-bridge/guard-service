import {
  Asset,
  ErgoBlockHeader,
  Register,
} from '../../../../src/chains/ergo/models/Interfaces';
import {
  BlockHeaders,
  ErgoStateContext,
  PreHeader,
} from 'ergo-lib-wasm-nodejs';

class TestData {
  /**
   * a mocked data that represents 10 block headers
   */
  static mockedBlockHeaderJson: ErgoBlockHeader[] = Array(10).fill({
    extensionId:
      '0000000000000000000000000000000000000000000000000000000000000000',
    difficulty: '5275058176',
    votes: '000000',
    timestamp: 0,
    size: 220,
    stateRoot:
      '000000000000000000000000000000000000000000000000000000000000000000',
    height: 100000,
    nBits: 0,
    version: 2,
    id: '0000000000000000000000000000000000000000000000000000000000000000',
    adProofsRoot:
      '0000000000000000000000000000000000000000000000000000000000000000',
    transactionsRoot:
      '0000000000000000000000000000000000000000000000000000000000000000',
    extensionHash:
      '0000000000000000000000000000000000000000000000000000000000000000',
    powSolutions: {
      pk: '03702266cae8daf75b7f09d4c23ad9cdc954849ee280eefae0d67bd97db4a68f6a',
      w: '0279be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798',
      n: '000000019cdfb631',
      d: 0,
    },
    adProofsId:
      '0000000000000000000000000000000000000000000000000000000000000000',
    transactionsId:
      '0000000000000000000000000000000000000000000000000000000000000000',
    parentId:
      '0000000000000000000000000000000000000000000000000000000000000000',
  });
  static mockedBlockHeaders = BlockHeaders.from_json(
    TestData.mockedBlockHeaderJson
  );
  static mockedErgoStateContext: ErgoStateContext = new ErgoStateContext(
    PreHeader.from_block_header(this.mockedBlockHeaders.get(0)),
    this.mockedBlockHeaders
  );

  static mockTransactionInputBoxes = (boxIds: string[]): string => `[
        ${boxIds
          .map(
            (id) => `{
            "boxId": "${id}",
            "extension": {}
        }`
          )
          .join(',')}
    ]`;

  static mockTransactionFeeBox = `{
        "value": 1100000,
        "ergoTree": "1005040004000e36100204a00b08cd0279be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798ea02d192a39a8cc7a701730073011001020402d19683030193a38cc7b2a57300000193c2b2a57301007473027303830108cdeeac93b1a57304",
        "assets": [],
        "additionalRegisters": {},
        "creationHeight": 100000
    }`;

  static tokenTransferringErgPaymentTransactionString = (
    boxIds: string[],
    targetAddressErgoTree: string,
    watcherBoxes: string[],
    bridgeFeeErgoTree: string,
    networkFeeErgoTree: string,
    bankAddressErgoTree: string
  ): string => `{
        "inputs": ${this.mockTransactionInputBoxes(boxIds)},
        "dataInputs": [],
        "outputs": [
            {
                "value": 100000,
                "ergoTree": "${targetAddressErgoTree}",
                "assets": [
                    {
                        "tokenId": "907a31bdadad63e44e5b3a132eb5be218e694270fae6fa55b197ecccac19f87e",
                        "amount": 65
                    }
                ],
                "additionalRegisters": {},
                "creationHeight": 100000
            },
            ${watcherBoxes.join(',')},
            {
                "value": 100000,
                "ergoTree": "${bridgeFeeErgoTree}",
                "assets": [
                    {
                        "tokenId": "907a31bdadad63e44e5b3a132eb5be218e694270fae6fa55b197ecccac19f87e",
                        "amount": 13
                    }
                ],
                "additionalRegisters": {
                    "R4": "1a0100"
                },
                "creationHeight": 100000
            },
            {
                "value": 100000,
                "ergoTree": "${networkFeeErgoTree}",
                "assets": [
                    {   
                        "tokenId": "907a31bdadad63e44e5b3a132eb5be218e694270fae6fa55b197ecccac19f87e",
                        "amount": 5
                    }
                ],
                "additionalRegisters": {},
                "creationHeight": 100000
            },
            {
                "value": 139998600000,
                "ergoTree": "${bankAddressErgoTree}",
                "assets": [
                    {
                        "tokenId": "907a31bdadad63e44e5b3a132eb5be218e694270fae6fa55b197ecccac19f87e",
                        "amount": 9
                    },
                    {
                        "tokenId": "e2b7b6ab2a7c6dfc6a82cc648f3b16b76db1cf19e93b7ac35a4898c06e4d08ce",
                        "amount": 100
                    },
                    {
                        "tokenId": "a2a6c892c38d508a659caf857dbe29da4343371e597efd42e40f9bc99099a516",
                        "amount": 10000000000
                    }
                ],
                "additionalRegisters": {},
                "creationHeight": 100000
            },
            ${this.mockTransactionFeeBox}
        ]
    }`;

  static wrongR4PaymentTransactionString = (
    boxIds: string[],
    targetAddressErgoTree: string,
    watcherBoxes: string[],
    bridgeFeeErgoTree: string,
    networkFeeErgoTree: string,
    bankAddressErgoTree: string
  ): string => `{
        "inputs": ${this.mockTransactionInputBoxes(boxIds)},
        "dataInputs": [],
        "outputs": [
            {
                "value": 100000,
                "ergoTree": "${targetAddressErgoTree}",
                "assets": [
                    {
                        "tokenId": "907a31bdadad63e44e5b3a132eb5be218e694270fae6fa55b197ecccac19f87e",
                        "amount": 65
                    }
                ],
                "additionalRegisters": {},
                "creationHeight": 100000
            },
            ${watcherBoxes.join(',')},
            {
                "value": 100000,
                "ergoTree": "${bridgeFeeErgoTree}",
                "assets": [
                    {
                        "tokenId": "907a31bdadad63e44e5b3a132eb5be218e694270fae6fa55b197ecccac19f87e",
                        "amount": 13
                    }
                ],
                "additionalRegisters": {
                    "R4": "1a0120001b0f0ca1b87bf9444ff29c39efdf12b0061c67f42826e55f6d34f2479bffff"
                },
                "creationHeight": 100000
            },
            {
                "value": 100000,
                "ergoTree": "${networkFeeErgoTree}",
                "assets": [
                    {   
                        "tokenId": "907a31bdadad63e44e5b3a132eb5be218e694270fae6fa55b197ecccac19f87e",
                        "amount": 5
                    }
                ],
                "additionalRegisters": {},
                "creationHeight": 100000
            },
            {
                "value": 139998600000,
                "ergoTree": "${bankAddressErgoTree}",
                "assets": [
                    {
                        "tokenId": "907a31bdadad63e44e5b3a132eb5be218e694270fae6fa55b197ecccac19f87e",
                        "amount": 16
                    },
                    {
                        "tokenId": "e2b7b6ab2a7c6dfc6a82cc648f3b16b76db1cf19e93b7ac35a4898c06e4d08ce",
                        "amount": 100
                    },
                    {
                        "tokenId": "a2a6c892c38d508a659caf857dbe29da4343371e597efd42e40f9bc99099a516",
                        "amount": 10000000000
                    }
                ],
                "additionalRegisters": {},
                "creationHeight": 100000
            },
            ${this.mockTransactionFeeBox}
        ]
    }`;

  static ergOnlyTokenPaymentTransactionString = (
    boxIds: string[],
    targetAddressErgoTree: string,
    watcherBoxes: string[],
    bridgeFeeErgoTree: string,
    networkFeeErgoTree: string,
    bankAddressErgoTree: string
  ): string => `{
        "inputs": ${this.mockTransactionInputBoxes(boxIds)},
        "dataInputs": [],
        "outputs": [
            {
                "value": 100000,
                "ergoTree": "${targetAddressErgoTree}",
                "assets": [],
                "additionalRegisters": {},
                "creationHeight": 100000
            },
            ${watcherBoxes.join(',')},
            {
                "value": 100000,
                "ergoTree": "${bridgeFeeErgoTree}",
                "assets": [
                    {
                        "tokenId": "907a31bdadad63e44e5b3a132eb5be218e694270fae6fa55b197ecccac19f87e",
                        "amount": 13
                    }
                ],
                "additionalRegisters": {
                    "R4": "1a0100"
                },
                "creationHeight": 100000
            },
            {
                "value": 100000,
                "ergoTree": "${networkFeeErgoTree}",
                "assets": [
                    {   
                        "tokenId": "907a31bdadad63e44e5b3a132eb5be218e694270fae6fa55b197ecccac19f87e",
                        "amount": 5
                    }
                ],
                "additionalRegisters": {},
                "creationHeight": 100000
            },
            {
                "value": 139998600000,
                "ergoTree": "${bankAddressErgoTree}",
                "assets": [
                    {
                        "tokenId": "907a31bdadad63e44e5b3a132eb5be218e694270fae6fa55b197ecccac19f87e",
                        "amount": 74
                    },
                    {
                        "tokenId": "e2b7b6ab2a7c6dfc6a82cc648f3b16b76db1cf19e93b7ac35a4898c06e4d08ce",
                        "amount": 100
                    }
                ],
                "additionalRegisters": {},
                "creationHeight": 100000
            },
            ${this.mockTransactionFeeBox}
        ]
    }`;

  static multipleTokenTransferringTokenPaymentTransactionString = (
    boxIds: string[],
    targetAddressErgoTree: string,
    watcherBoxes: string[],
    bridgeFeeErgoTree: string,
    networkFeeErgoTree: string,
    bankAddressErgoTree: string
  ): string => `{
        "inputs": ${this.mockTransactionInputBoxes(boxIds)},
        "dataInputs": [],
        "outputs": [
            {
                "value": 100000,
                "ergoTree": "${targetAddressErgoTree}",
                "assets": [
                    {
                        "tokenId": "907a31bdadad63e44e5b3a132eb5be218e694270fae6fa55b197ecccac19f87e",
                        "amount": 65
                    },
                    {
                        "tokenId": "e2b7b6ab2a7c6dfc6a82cc648f3b16b76db1cf19e93b7ac35a4898c06e4d08ce",
                        "amount": 10
                    }
                ],
                "additionalRegisters": {},
                "creationHeight": 100000
            },
            ${watcherBoxes.join(',')},
            {
                "value": 100000,
                "ergoTree": "${bridgeFeeErgoTree}",
                "assets": [
                    {
                        "tokenId": "907a31bdadad63e44e5b3a132eb5be218e694270fae6fa55b197ecccac19f87e",
                        "amount": 13
                    }
                ],
                "additionalRegisters": {
                    "R4": "1a0100"
                },
                "creationHeight": 100000
            },
            {
                "value": 100000,
                "ergoTree": "${networkFeeErgoTree}",
                "assets": [
                    {   
                        "tokenId": "907a31bdadad63e44e5b3a132eb5be218e694270fae6fa55b197ecccac19f87e",
                        "amount": 5
                    }
                ],
                "additionalRegisters": {},
                "creationHeight": 100000
            },
            {
                "value": 139998600000,
                "ergoTree": "${bankAddressErgoTree}",
                "assets": [
                    {
                        "tokenId": "907a31bdadad63e44e5b3a132eb5be218e694270fae6fa55b197ecccac19f87e",
                        "amount": 9
                    },
                    {
                        "tokenId": "e2b7b6ab2a7c6dfc6a82cc648f3b16b76db1cf19e93b7ac35a4898c06e4d08ce",
                        "amount": 90
                    }
                ],
                "additionalRegisters": {},
                "creationHeight": 100000
            },
            ${this.mockTransactionFeeBox}
        ]
    }`;

  static wrongTokenTransferringTokenPaymentTransactionString = (
    boxIds: string[],
    targetAddressErgoTree: string,
    watcherBoxes: string[],
    bridgeFeeErgoTree: string,
    networkFeeErgoTree: string,
    bankAddressErgoTree: string
  ): string => `{
        "inputs": ${this.mockTransactionInputBoxes(boxIds)},
        "dataInputs": [],
        "outputs": [
            {
                "value": 100000,
                "ergoTree": "${targetAddressErgoTree}",
                "assets": [
                    {
                        "tokenId": "e2b7b6ab2a7c6dfc6a82cc648f3b16b76db1cf19e93b7ac35a4898c06e4d08ce",
                        "amount": 65
                    }
                ],
                "additionalRegisters": {},
                "creationHeight": 100000
            },
            ${watcherBoxes.join(',')},
            {
                "value": 100000,
                "ergoTree": "${bridgeFeeErgoTree}",
                "assets": [
                    {
                        "tokenId": "907a31bdadad63e44e5b3a132eb5be218e694270fae6fa55b197ecccac19f87e",
                        "amount": 13
                    }
                ],
                "additionalRegisters": {
                    "R4": "1a0100"
                },
                "creationHeight": 100000
            },
            {
                "value": 100000,
                "ergoTree": "${networkFeeErgoTree}",
                "assets": [
                    {   
                        "tokenId": "907a31bdadad63e44e5b3a132eb5be218e694270fae6fa55b197ecccac19f87e",
                        "amount": 5
                    }
                ],
                "additionalRegisters": {},
                "creationHeight": 100000
            },
            {
                "value": 139998600000,
                "ergoTree": "${bankAddressErgoTree}",
                "assets": [
                    {
                        "tokenId": "907a31bdadad63e44e5b3a132eb5be218e694270fae6fa55b197ecccac19f87e",
                        "amount": 74
                    },
                    {
                        "tokenId": "e2b7b6ab2a7c6dfc6a82cc648f3b16b76db1cf19e93b7ac35a4898c06e4d08ce",
                        "amount": 35
                    }
                ],
                "additionalRegisters": {},
                "creationHeight": 100000
            },
            ${this.mockTransactionFeeBox}
        ]
    }`;

  static tokenTransferringErgRewardDistributionTxString = (
    boxIds: string[],
    watcherBoxes: string[],
    bridgeFeeErgoTree: string,
    networkFeeErgoTree: string,
    bankAddressErgoTree: string
  ): string => `{
        "inputs": ${this.mockTransactionInputBoxes(boxIds)},
        "dataInputs": [],
        "outputs": [
            ${watcherBoxes.join(',')},
            {
                "value": 500000003,
                "ergoTree": "${bridgeFeeErgoTree}",
                "assets": [
                    {
                        "tokenId": "907a31bdadad63e44e5b3a132eb5be218e694270fae6fa55b197ecccac19f87e",
                        "amount": 13
                    }
                ],
                "additionalRegisters": {},
                "creationHeight": 100000
            },
            {
                "value": 1500000,
                "ergoTree": "${networkFeeErgoTree}",
                "assets": [
                    {   
                        "tokenId": "907a31bdadad63e44e5b3a132eb5be218e694270fae6fa55b197ecccac19f87e",
                        "amount": 5
                    }
                ],
                "additionalRegisters": {},
                "creationHeight": 100000
            },
            {
                "value": 138997400000,
                "ergoTree": "${bankAddressErgoTree}",
                "assets": [
                    {
                        "tokenId": "907a31bdadad63e44e5b3a132eb5be218e694270fae6fa55b197ecccac19f87e",
                        "amount": 54
                    },
                    {
                        "tokenId": "e2b7b6ab2a7c6dfc6a82cc648f3b16b76db1cf19e93b7ac35a4898c06e4d08ce",
                        "amount": 100
                    }
                ],
                "additionalRegisters": {},
                "creationHeight": 100000
            },
            ${this.mockTransactionFeeBox}
        ]
    }`;

  static tokenRewardDistributionTxString = (
    boxIds: string[],
    watcherBoxes: string[],
    bridgeFeeErgoTree: string,
    networkFeeErgoTree: string,
    bankAddressErgoTree: string
  ): string => `{
        "inputs": ${this.mockTransactionInputBoxes(boxIds)},
        "dataInputs": [],
        "outputs": [
            ${watcherBoxes.join(',')},
            {
                "value": 100000,
                "ergoTree": "${bridgeFeeErgoTree}",
                "assets": [
                    {
                        "tokenId": "907a31bdadad63e44e5b3a132eb5be218e694270fae6fa55b197ecccac19f87e",
                        "amount": 13
                    }
                ],
                "additionalRegisters": {
                    "R4": "1a0120001b0f0ca1b87bf9444ff29c39efdf12b0061c67f42826e55f6d34f2479be7aa"
                },
                "creationHeight": 100000
            },
            {
                "value": 100000,
                "ergoTree": "${networkFeeErgoTree}",
                "assets": [
                    {   
                        "tokenId": "907a31bdadad63e44e5b3a132eb5be218e694270fae6fa55b197ecccac19f87e",
                        "amount": 5
                    }
                ],
                "additionalRegisters": {},
                "creationHeight": 100000
            },
            {
                "value": 139998700000,
                "ergoTree": "${bankAddressErgoTree}",
                "assets": [
                    {
                        "tokenId": "907a31bdadad63e44e5b3a132eb5be218e694270fae6fa55b197ecccac19f87e",
                        "amount": 54
                    },
                    {
                        "tokenId": "e2b7b6ab2a7c6dfc6a82cc648f3b16b76db1cf19e93b7ac35a4898c06e4d08ce",
                        "amount": 100
                    }
                ],
                "additionalRegisters": {},
                "creationHeight": 100000
            },
            ${this.mockTransactionFeeBox}
        ]
    }`;

  static illegalChangeBoxTokenRewardDistributionTxString = (
    boxIds: string[],
    watcherBoxes: string[],
    bridgeFeeErgoTree: string,
    networkFeeErgoTree: string,
    nonBankAddressErgoTree: string
  ): string => `{
        "inputs": ${this.mockTransactionInputBoxes(boxIds)},
        "dataInputs": [],
        "outputs": [
            ${watcherBoxes.join(',')},
            {
                "value": 100000,
                "ergoTree": "${bridgeFeeErgoTree}",
                "assets": [
                    {
                        "tokenId": "907a31bdadad63e44e5b3a132eb5be218e694270fae6fa55b197ecccac19f87e",
                        "amount": 13
                    }
                ],
                "additionalRegisters": {},
                "creationHeight": 100000
            },
            {
                "value": 100000,
                "ergoTree": "${networkFeeErgoTree}",
                "assets": [
                    {   
                        "tokenId": "907a31bdadad63e44e5b3a132eb5be218e694270fae6fa55b197ecccac19f87e",
                        "amount": 5
                    }
                ],
                "additionalRegisters": {},
                "creationHeight": 100000
            },
            {
                "value": 139998700000,
                "ergoTree": "${nonBankAddressErgoTree}",
                "assets": [
                    {
                        "tokenId": "907a31bdadad63e44e5b3a132eb5be218e694270fae6fa55b197ecccac19f87e",
                        "amount": 54
                    },
                    {
                        "tokenId": "e2b7b6ab2a7c6dfc6a82cc648f3b16b76db1cf19e93b7ac35a4898c06e4d08ce",
                        "amount": 100
                    }
                ],
                "additionalRegisters": {},
                "creationHeight": 100000
            },
            ${this.mockTransactionFeeBox}
        ]
    }`;

  static wrongTokenRewardDistributionTxString = (
    boxIds: string[],
    watcherBoxes: string[],
    bridgeFeeErgoTree: string,
    networkFeeErgoTree: string,
    bankAddressErgoTree: string
  ): string => `{
        "inputs": ${this.mockTransactionInputBoxes(boxIds)},
        "dataInputs": [],
        "outputs": [
            ${watcherBoxes.join(',')},
            {
                "value": 100000,
                "ergoTree": "${bridgeFeeErgoTree}",
                "assets": [
                    {
                        "tokenId": "e2b7b6ab2a7c6dfc6a82cc648f3b16b76db1cf19e93b7ac35a4898c06e4d08ce",
                        "amount": 13
                    }
                ],
                "additionalRegisters": {},
                "creationHeight": 100000
            },
            {
                "value": 100000,
                "ergoTree": "${networkFeeErgoTree}",
                "assets": [
                    {   
                        "tokenId": "e2b7b6ab2a7c6dfc6a82cc648f3b16b76db1cf19e93b7ac35a4898c06e4d08ce",
                        "amount": 5
                    }
                ],
                "additionalRegisters": {},
                "creationHeight": 100000
            },
            {
                "value": 139998700000,
                "ergoTree": "${bankAddressErgoTree}",
                "assets": [
                    {
                        "tokenId": "907a31bdadad63e44e5b3a132eb5be218e694270fae6fa55b197ecccac19f87e",
                        "amount": 79
                    },
                    {
                        "tokenId": "e2b7b6ab2a7c6dfc6a82cc648f3b16b76db1cf19e93b7ac35a4898c06e4d08ce",
                        "amount": 73
                    }
                ],
                "additionalRegisters": {},
                "creationHeight": 100000
            },
            ${this.mockTransactionFeeBox}
        ]
    }`;

  static wrongTokenAmountRewardDistributionTxString = (
    boxIds: string[],
    watcherBoxes: string[],
    bridgeFeeErgoTree: string,
    networkFeeErgoTree: string,
    bankAddressErgoTree: string
  ): string => `{
        "inputs": ${this.mockTransactionInputBoxes(boxIds)},
        "dataInputs": [],
        "outputs": [
            ${watcherBoxes.join(',')},
            {
                "value": 100000,
                "ergoTree": "${bridgeFeeErgoTree}",
                "assets": [
                    {
                        "tokenId": "907a31bdadad63e44e5b3a132eb5be218e694270fae6fa55b197ecccac19f87e",
                        "amount": 13
                    }
                ],
                "additionalRegisters": {
                    "R4": "1a0120001b0f0ca1b87bf9444ff29c39efdf12b0061c67f42826e55f6d34f2479be7aa"
                },
                "creationHeight": 100000
            },
            {
                "value": 100000,
                "ergoTree": "${networkFeeErgoTree}",
                "assets": [
                    {   
                        "tokenId": "907a31bdadad63e44e5b3a132eb5be218e694270fae6fa55b197ecccac19f87e",
                        "amount": 5
                    }
                ],
                "additionalRegisters": {},
                "creationHeight": 100000
            },
            {
                "value": 139998700000,
                "ergoTree": "${bankAddressErgoTree}",
                "assets": [
                    {
                        "tokenId": "907a31bdadad63e44e5b3a132eb5be218e694270fae6fa55b197ecccac19f87e",
                        "amount": 47
                    },
                    {
                        "tokenId": "e2b7b6ab2a7c6dfc6a82cc648f3b16b76db1cf19e93b7ac35a4898c06e4d08ce",
                        "amount": 100
                    }
                ],
                "additionalRegisters": {},
                "creationHeight": 100000
            },
            ${this.mockTransactionFeeBox}
        ]
    }`;

  static mockWatcherPermitBox = (
    value: bigint,
    assets: Asset[],
    boxErgoTree: string,
    registers: Register[]
  ): string => `{
        "value": ${value.toString()},
        "ergoTree": "${boxErgoTree}",
        "assets": [
            ${assets
              .map(
                (asset) => `{
                "tokenId": "${asset.tokenId}",
                "amount": ${asset.amount}
            }`
              )
              .join(',')}
        ],
        "additionalRegisters": {
            ${registers
              .map(
                (reg) =>
                  `"R${reg.registerId}": "${reg.value.encode_to_base16()}"`
              )
              .join(',')}
        },
        "creationHeight": 100000
    }`;

  static tokenPaymentTransactionString = (
    boxIds: string[],
    targetAddressErgoTree: string,
    watcherBoxes: string[],
    bridgeFeeErgoTree: string,
    networkFeeErgoTree: string,
    bankAddressErgoTree: string,
    tokenId: string
  ): string => `{
        "inputs": ${this.mockTransactionInputBoxes(boxIds)},
        "dataInputs": [],
        "outputs": [
            {
                "value": 100000,
                "ergoTree": "${targetAddressErgoTree}",
                "assets": [
                    {
                        "tokenId": "907a31bdadad63e44e5b3a132eb5be218e694270fae6fa55b197ecccac19f87e",
                        "amount": 65
                    }
                ],
                "additionalRegisters": {},
                "creationHeight": 100000
            },
            ${watcherBoxes.join(',')},
            {
                "value": 100000,
                "ergoTree": "${bridgeFeeErgoTree}",
                "assets": [
                    {
                        "tokenId": "907a31bdadad63e44e5b3a132eb5be218e694270fae6fa55b197ecccac19f87e",
                        "amount": 13
                    }
                ],
                "additionalRegisters": {
                    "R4": "1a0100"
                },
                "creationHeight": 100000
            },
            {
                "value": 100000,
                "ergoTree": "${networkFeeErgoTree}",
                "assets": [
                    {   
                        "tokenId": "907a31bdadad63e44e5b3a132eb5be218e694270fae6fa55b197ecccac19f87e",
                        "amount": 5
                    }
                ],
                "additionalRegisters": {},
                "creationHeight": 100000
            },
            {
                "value": 139998600000,
                "ergoTree": "${bankAddressErgoTree}",
                "assets": [
                    {
                        "tokenId": "907a31bdadad63e44e5b3a132eb5be218e694270fae6fa55b197ecccac19f87e",
                        "amount": 9
                    },
                    {
                        "tokenId": "${tokenId}",
                        "amount": 99
                    }
                ],
                "additionalRegisters": {},
                "creationHeight": 100000
            },
            ${this.mockTransactionFeeBox}
        ]
    }`;

  static ergPaymentTransactionString = (
    boxIds: string[],
    targetAddressErgoTree: string,
    watcherBoxes: string[],
    bridgeFeeErgoTree: string,
    networkFeeErgoTree: string,
    bankAddressErgoTree: string,
    tokenId: string
  ): string => `{
        "inputs": ${this.mockTransactionInputBoxes(boxIds)},
        "dataInputs": [],
        "outputs": [
            {
                "value": 48998500000,
                "ergoTree": "${targetAddressErgoTree}",
                "assets": [],
                "additionalRegisters": {},
                "creationHeight": 100000
            },
            ${watcherBoxes.join(',')},
            {
                "value": 499300003,
                "ergoTree": "${bridgeFeeErgoTree}",
                "assets": [],
                "additionalRegisters": {
                    "R4": "1a0100"
                },
                "creationHeight": 100000
            },
            {
                "value": 1500000,
                "ergoTree": "${networkFeeErgoTree}",
                "assets": [],
                "additionalRegisters": {},
                "creationHeight": 100000
            },
            {
                "value": 89998900000,
                "ergoTree": "${bankAddressErgoTree}",
                "assets": [
                    {
                        "tokenId": "907a31bdadad63e44e5b3a132eb5be218e694270fae6fa55b197ecccac19f87e",
                        "amount": 99
                    },
                    {
                        "tokenId": "${tokenId}",
                        "amount": 99
                    }
                ],
                "additionalRegisters": {},
                "creationHeight": 100000
            },
            ${this.mockTransactionFeeBox}
        ]
    }`;

  static tokenDistributionTxString = (
    boxIds: string[],
    watcherBoxes: string[],
    bridgeFeeErgoTree: string,
    networkFeeErgoTree: string,
    bankAddressErgoTree: string,
    tokenId: string
  ): string => `{
        "inputs": ${this.mockTransactionInputBoxes(boxIds)},
        "dataInputs": [],
        "outputs": [
            ${watcherBoxes.join(',')},
            {
                "value": 100000,
                "ergoTree": "${bridgeFeeErgoTree}",
                "assets": [
                    {
                        "tokenId": "907a31bdadad63e44e5b3a132eb5be218e694270fae6fa55b197ecccac19f87e",
                        "amount": 13
                    }
                ],
                "additionalRegisters": {
                    "R4": "1a0120001b0f0ca1b87bf9444ff29c39efdf12b0061c67f42826e55f6d34f2479be7aa"
                },
                "creationHeight": 100000
            },
            {
                "value": 100000,
                "ergoTree": "${networkFeeErgoTree}",
                "assets": [
                    {   
                        "tokenId": "907a31bdadad63e44e5b3a132eb5be218e694270fae6fa55b197ecccac19f87e",
                        "amount": 5
                    }
                ],
                "additionalRegisters": {},
                "creationHeight": 100000
            },
            {
                "value": 139998700000,
                "ergoTree": "${bankAddressErgoTree}",
                "assets": [
                    {
                        "tokenId": "907a31bdadad63e44e5b3a132eb5be218e694270fae6fa55b197ecccac19f87e",
                        "amount": 74
                    },
                    {
                        "tokenId": "${tokenId}",
                        "amount": 99
                    }
                ],
                "additionalRegisters": {},
                "creationHeight": 100000
            },
            ${this.mockTransactionFeeBox}
        ]
    }`;

  static ergDistributionTxString = (
    boxIds: string[],
    watcherBoxes: string[],
    bridgeFeeErgoTree: string,
    networkFeeErgoTree: string,
    bankAddressErgoTree: string,
    tokenId: string
  ): string => `{
        "inputs": ${this.mockTransactionInputBoxes(boxIds)},
        "dataInputs": [],
        "outputs": [
            ${watcherBoxes.join(',')},
            {
                "value": 499300003,
                "ergoTree": "${bridgeFeeErgoTree}",
                "assets": [],
                "additionalRegisters": {
                    "R4": "1a0120001b0f0ca1b87bf9444ff29c39efdf12b0061c67f42826e55f6d34f2479be7aa"
                },
                "creationHeight": 100000
            },
            {
                "value": 1500000,
                "ergoTree": "${networkFeeErgoTree}",
                "assets": [],
                "additionalRegisters": {},
                "creationHeight": 100000
            },
            {
                "value": 138997400000,
                "ergoTree": "${bankAddressErgoTree}",
                "assets": [
                    {
                        "tokenId": "907a31bdadad63e44e5b3a132eb5be218e694270fae6fa55b197ecccac19f87e",
                        "amount": 99
                    },
                    {
                        "tokenId": "${tokenId}",
                        "amount": 99
                    }
                ],
                "additionalRegisters": {},
                "creationHeight": 100000
            },
            ${this.mockTransactionFeeBox}
        ]
    }`;

  static mockedObservationTx = `
    {
      "id": "d04fc93dc15a28a1f0e50b0fffc94f360037dcedddaf8a2e25905a892cd48378",
      "blockId": "6e74499171d828ee51266d3b65011cf958afe551ce7a0d74e5f6aba9029ae90c",
      "inclusionHeight": 253478,
      "timestamp": 1658485237304,
      "index": 1,
      "globalIndex": 266474,
      "numConfirmations": 2187,
      "inputs": [
        {
          "boxId": "e61780d6caa840d3dfc455900bf41b033e16cec27dca2ebfc033cb9d26612335",
          "value": 1000100000,
          "index": 0,
          "spendingProof": "12806d7b68be67c6c3a7f96ece494cacdabc809b68bd79ae9e3b796b92cd53d1fcbb1533dc91a70016bcec64c280fe6c95a003bc5019b09d",
          "outputBlockId": "255f6e4ed26ee7a5860f5dfe7ce803eb4da465df355634481f7f44004cd52abc",
          "outputTransactionId": "e2659ee1f5c0bb021d3a46c092af39a0589d808a1286f90cee04983a2fc76664",
          "outputIndex": 2,
          "outputGlobalIndex": 546800,
          "outputCreatedAt": 252817,
          "outputSettledAt": 252819,
          "ergoTree": "0008cd028bcc85fa22006fa13767ab00af28ae0b2389d576fb59cfd0e46865e0449eeb8a",
          "address": "9fadVRGYyiSBCgD7QtZU13BfGoDyTQ1oX918P8py22MJuMEwSuo",
          "assets": [
            {
              "tokenId": "064c58ea394d41fada074a3c560a132467adf4ca1512c409c014c625ca285e9c",
              "index": 0,
              "amount": 1,
              "name": null,
              "decimals": null,
              "type": null
            },
            {
              "tokenId": "a2a6c892c38d508a659caf857dbe29da4343371e597efd42e40f9bc99099a516",
              "index": 1,
              "amount": 9000,
              "name": "RSN",
              "decimals": 0,
              "type": "EIP-004"
            },
            {
              "tokenId": "0034c44f0c7a38f833190d44125ff9b3a0dd9dbb89138160182a930bc521db95",
              "index": 2,
              "amount": 20,
              "name": "SWSE",
              "decimals": 0,
              "type": "EIP-004"
            }
          ],
          "additionalRegisters": {}
        }
      ],
      "dataInputs": [],
      "outputs": [
        {
          "boxId": "75a836e2c548c4e47fa75761c85168e6f0563bf7ec9db4aa21b6863a701b0637",
          "transactionId": "d04fc93dc15a28a1f0e50b0fffc94f360037dcedddaf8a2e25905a892cd48378",
          "blockId": "6e74499171d828ee51266d3b65011cf958afe551ce7a0d74e5f6aba9029ae90c",
          "value": 1100000,
          "index": 0,
          "globalIndex": 548120,
          "creationHeight": 253476,
          "settlementHeight": 253478,
          "ergoTree": "10010e20a6ac381e6fa99929fd1477b3ba9499790a775e91d4c14c5aa86e9a118dfac853d1aea4d9010163aedb63087201d901034d0e938c7203017300",
          "address": "2CBjjwbY9Rokj7Ue9qT2pbMR2WhLDmdcL2V9pRgCEEMks9QRXiQ7K73wNANLAczY1XLimkNBu6Nt3hW1zACrk4zQxu",
          "assets": [
            {
              "tokenId": "0034c44f0c7a38f833190d44125ff9b3a0dd9dbb89138160182a930bc521db95",
              "index": 0,
              "amount": 2,
              "name": "SWSE",
              "decimals": 0,
              "type": "EIP-004"
            }
          ],
          "additionalRegisters": {
            "R4": {
              "serializedValue": "1a050763617264616e6f0a746f41646472657373340631303030303004323530300b66726f6d41646472657373",
              "sigmaType": "Coll[Coll[SByte]]",
              "renderedValue": "[63617264616e6f,746f4164647265737334,313030303030,32353030,66726f6d41646472657373]"
            }
          },
          "spentTransactionId": null,
          "mainChain": true
        },
        {
          "boxId": "c9044cd4b2cbc1bca6acb3eae8a634533c8f91bb14fe1f04579b2ca240c56778",
          "transactionId": "d04fc93dc15a28a1f0e50b0fffc94f360037dcedddaf8a2e25905a892cd48378",
          "blockId": "6e74499171d828ee51266d3b65011cf958afe551ce7a0d74e5f6aba9029ae90c",
          "value": 997900000,
          "index": 1,
          "globalIndex": 548121,
          "creationHeight": 253476,
          "settlementHeight": 253478,
          "ergoTree": "0008cd028bcc85fa22006fa13767ab00af28ae0b2389d576fb59cfd0e46865e0449eeb8a",
          "address": "9fadVRGYyiSBCgD7QtZU13BfGoDyTQ1oX918P8py22MJuMEwSuo",
          "assets": [
            {
              "tokenId": "064c58ea394d41fada074a3c560a132467adf4ca1512c409c014c625ca285e9c",
              "index": 0,
              "amount": 1,
              "name": null,
              "decimals": null,
              "type": null
            },
            {
              "tokenId": "a2a6c892c38d508a659caf857dbe29da4343371e597efd42e40f9bc99099a516",
              "index": 1,
              "amount": 9000,
              "name": "RSN",
              "decimals": 0,
              "type": "EIP-004"
            },
            {
              "tokenId": "0034c44f0c7a38f833190d44125ff9b3a0dd9dbb89138160182a930bc521db95",
              "index": 2,
              "amount": 18,
              "name": "SWSE",
              "decimals": 0,
              "type": "EIP-004"
            }
          ],
          "additionalRegisters": {},
          "spentTransactionId": "ce0208fb246f031d105ef48baeb45165dbcf201d06ecd2ea1cd3abb471864883",
          "mainChain": true
        },
        {
          "boxId": "158145208df21577e9832d7fbd3d945cf00b133b371acca53904380e7eeb6942",
          "transactionId": "d04fc93dc15a28a1f0e50b0fffc94f360037dcedddaf8a2e25905a892cd48378",
          "blockId": "6e74499171d828ee51266d3b65011cf958afe551ce7a0d74e5f6aba9029ae90c",
          "value": 1100000,
          "index": 2,
          "globalIndex": 548122,
          "creationHeight": 253476,
          "settlementHeight": 253478,
          "ergoTree": "1005040004000e36100204a00b08cd0279be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798ea02d192a39a8cc7a701730073011001020402d19683030193a38cc7b2a57300000193c2b2a57301007473027303830108cdeeac93b1a57304",
          "address": "2iHkR7CWvD1R4j1yZg5bkeDRQavjAaVPeTDFGGLZduHyfWMuYpmhHocX8GJoaieTx78FntzJbCBVL6rf96ocJoZdmWBL2fci7NqWgAirppPQmZ7fN9V6z13Ay6brPriBKYqLp1bT2Fk4FkFLCfdPpe",
          "assets": [],
          "additionalRegisters": {},
          "spentTransactionId": null,
          "mainChain": true
        }
      ],
      "size": 456
    }`;

  static mockedErgObservationTx = `
    {
      "id": "000fc93dc15a28a1f0e50b0fffc94f360037dcedddaf8a2e25905a892cd48378",
      "blockId": "6e74499171d828ee51266d3b65011cf958afe551ce7a0d74e5f6aba9029ae90c",
      "inclusionHeight": 253478,
      "timestamp": 1658485237304,
      "index": 1,
      "globalIndex": 266474,
      "numConfirmations": 2187,
      "inputs": [
        {
          "boxId": "e61780d6caa840d3dfc455900bf41b033e16cec27dca2ebfc033cb9d26612335",
          "value": 1000100000,
          "index": 0,
          "spendingProof": "12806d7b68be67c6c3a7f96ece494cacdabc809b68bd79ae9e3b796b92cd53d1fcbb1533dc91a70016bcec64c280fe6c95a003bc5019b09d",
          "outputBlockId": "255f6e4ed26ee7a5860f5dfe7ce803eb4da465df355634481f7f44004cd52abc",
          "outputTransactionId": "e2659ee1f5c0bb021d3a46c092af39a0589d808a1286f90cee04983a2fc76664",
          "outputIndex": 2,
          "outputGlobalIndex": 546800,
          "outputCreatedAt": 252817,
          "outputSettledAt": 252819,
          "ergoTree": "0008cd028bcc85fa22006fa13767ab00af28ae0b2389d576fb59cfd0e46865e0449eeb8a",
          "address": "9fadVRGYyiSBCgD7QtZU13BfGoDyTQ1oX918P8py22MJuMEwSuo",
          "assets": [
            {
              "tokenId": "064c58ea394d41fada074a3c560a132467adf4ca1512c409c014c625ca285e9c",
              "index": 0,
              "amount": 1,
              "name": null,
              "decimals": null,
              "type": null
            },
            {
              "tokenId": "a2a6c892c38d508a659caf857dbe29da4343371e597efd42e40f9bc99099a516",
              "index": 1,
              "amount": 9000,
              "name": "RSN",
              "decimals": 0,
              "type": "EIP-004"
            },
            {
              "tokenId": "0034c44f0c7a38f833190d44125ff9b3a0dd9dbb89138160182a930bc521db95",
              "index": 2,
              "amount": 20,
              "name": "SWSE",
              "decimals": 0,
              "type": "EIP-004"
            }
          ],
          "additionalRegisters": {}
        }
      ],
      "dataInputs": [],
      "outputs": [
        {
          "boxId": "75a836e2c548c4e47fa75761c85168e6f0563bf7ec9db4aa21b6863a701b0637",
          "transactionId": "d04fc93dc15a28a1f0e50b0fffc94f360037dcedddaf8a2e25905a892cd48378",
          "blockId": "6e74499171d828ee51266d3b65011cf958afe551ce7a0d74e5f6aba9029ae90c",
          "value": 11100000,
          "index": 0,
          "globalIndex": 548120,
          "creationHeight": 253476,
          "settlementHeight": 253478,
          "ergoTree": "10010e20a6ac381e6fa99929fd1477b3ba9499790a775e91d4c14c5aa86e9a118dfac853d1aea4d9010163aedb63087201d901034d0e938c7203017300",
          "address": "2CBjjwbY9Rokj7Ue9qT2pbMR2WhLDmdcL2V9pRgCEEMks9QRXiQ7K73wNANLAczY1XLimkNBu6Nt3hW1zACrk4zQxu",
          "assets": [
          ],
          "additionalRegisters": {
            "R4": {
              "serializedValue": "1a050763617264616e6f0a746f41646472657373340631303030303004323530300b66726f6d41646472657373",
              "sigmaType": "Coll[Coll[SByte]]",
              "renderedValue": "[63617264616e6f,746f4164647265737334,313030303030,32353030,66726f6d41646472657373]"
            }
          },
          "spentTransactionId": null,
          "mainChain": true
        },
        {
          "boxId": "c9044cd4b2cbc1bca6acb3eae8a634533c8f91bb14fe1f04579b2ca240c56778",
          "transactionId": "d04fc93dc15a28a1f0e50b0fffc94f360037dcedddaf8a2e25905a892cd48378",
          "blockId": "6e74499171d828ee51266d3b65011cf958afe551ce7a0d74e5f6aba9029ae90c",
          "value": 997900000,
          "index": 1,
          "globalIndex": 548121,
          "creationHeight": 253476,
          "settlementHeight": 253478,
          "ergoTree": "0008cd028bcc85fa22006fa13767ab00af28ae0b2389d576fb59cfd0e46865e0449eeb8a",
          "address": "9fadVRGYyiSBCgD7QtZU13BfGoDyTQ1oX918P8py22MJuMEwSuo",
          "assets": [
            {
              "tokenId": "064c58ea394d41fada074a3c560a132467adf4ca1512c409c014c625ca285e9c",
              "index": 0,
              "amount": 1,
              "name": null,
              "decimals": null,
              "type": null
            },
            {
              "tokenId": "a2a6c892c38d508a659caf857dbe29da4343371e597efd42e40f9bc99099a516",
              "index": 1,
              "amount": 9000,
              "name": "RSN",
              "decimals": 0,
              "type": "EIP-004"
            },
            {
              "tokenId": "0034c44f0c7a38f833190d44125ff9b3a0dd9dbb89138160182a930bc521db95",
              "index": 2,
              "amount": 18,
              "name": "SWSE",
              "decimals": 0,
              "type": "EIP-004"
            }
          ],
          "additionalRegisters": {},
          "spentTransactionId": "ce0208fb246f031d105ef48baeb45165dbcf201d06ecd2ea1cd3abb471864883",
          "mainChain": true
        },
        {
          "boxId": "158145208df21577e9832d7fbd3d945cf00b133b371acca53904380e7eeb6942",
          "transactionId": "d04fc93dc15a28a1f0e50b0fffc94f360037dcedddaf8a2e25905a892cd48378",
          "blockId": "6e74499171d828ee51266d3b65011cf958afe551ce7a0d74e5f6aba9029ae90c",
          "value": 1100000,
          "index": 2,
          "globalIndex": 548122,
          "creationHeight": 253476,
          "settlementHeight": 253478,
          "ergoTree": "1005040004000e36100204a00b08cd0279be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798ea02d192a39a8cc7a701730073011001020402d19683030193a38cc7b2a57300000193c2b2a57301007473027303830108cdeeac93b1a57304",
          "address": "2iHkR7CWvD1R4j1yZg5bkeDRQavjAaVPeTDFGGLZduHyfWMuYpmhHocX8GJoaieTx78FntzJbCBVL6rf96ocJoZdmWBL2fci7NqWgAirppPQmZ7fN9V6z13Ay6brPriBKYqLp1bT2Fk4FkFLCfdPpe",
          "assets": [],
          "additionalRegisters": {},
          "spentTransactionId": null,
          "mainChain": true
        }
      ],
      "size": 456
    }`;

  static mockedNonObservationTx = `
    {
      "id": "004fc93dc15a28a1f0e50b0fffc94f360037dcedddaf8a2e25905a892cd48378",
      "blockId": "6e74499171d828ee51266d3b65011cf958afe551ce7a0d74e5f6aba9029ae90c",
      "inclusionHeight": 253478,
      "timestamp": 1658485237304,
      "index": 1,
      "globalIndex": 266474,
      "numConfirmations": 2187,
      "inputs": [
        {
          "boxId": "e61780d6caa840d3dfc455900bf41b033e16cec27dca2ebfc033cb9d26612335",
          "value": 1000100000,
          "index": 0,
          "spendingProof": "12806d7b68be67c6c3a7f96ece494cacdabc809b68bd79ae9e3b796b92cd53d1fcbb1533dc91a70016bcec64c280fe6c95a003bc5019b09d",
          "outputBlockId": "255f6e4ed26ee7a5860f5dfe7ce803eb4da465df355634481f7f44004cd52abc",
          "outputTransactionId": "e2659ee1f5c0bb021d3a46c092af39a0589d808a1286f90cee04983a2fc76664",
          "outputIndex": 2,
          "outputGlobalIndex": 546800,
          "outputCreatedAt": 252817,
          "outputSettledAt": 252819,
          "ergoTree": "0008cd028bcc85fa22006fa13767ab00af28ae0b2389d576fb59cfd0e46865e0449eeb8a",
          "address": "9fadVRGYyiSBCgD7QtZU13BfGoDyTQ1oX918P8py22MJuMEwSuo",
          "assets": [
            {
              "tokenId": "064c58ea394d41fada074a3c560a132467adf4ca1512c409c014c625ca285e9c",
              "index": 0,
              "amount": 1,
              "name": null,
              "decimals": null,
              "type": null
            },
            {
              "tokenId": "a2a6c892c38d508a659caf857dbe29da4343371e597efd42e40f9bc99099a516",
              "index": 1,
              "amount": 9000,
              "name": "RSN",
              "decimals": 0,
              "type": "EIP-004"
            },
            {
              "tokenId": "0034c44f0c7a38f833190d44125ff9b3a0dd9dbb89138160182a930bc521db95",
              "index": 2,
              "amount": 20,
              "name": "SWSE",
              "decimals": 0,
              "type": "EIP-004"
            }
          ],
          "additionalRegisters": {}
        }
      ],
      "dataInputs": [],
      "outputs": [
        {
          "boxId": "c9044cd4b2cbc1bca6acb3eae8a634533c8f91bb14fe1f04579b2ca240c56778",
          "transactionId": "d04fc93dc15a28a1f0e50b0fffc94f360037dcedddaf8a2e25905a892cd48378",
          "blockId": "6e74499171d828ee51266d3b65011cf958afe551ce7a0d74e5f6aba9029ae90c",
          "value": 997900000,
          "index": 1,
          "globalIndex": 548121,
          "creationHeight": 253476,
          "settlementHeight": 253478,
          "ergoTree": "0008cd028bcc85fa22006fa13767ab00af28ae0b2389d576fb59cfd0e46865e0449eeb8a",
          "address": "9fadVRGYyiSBCgD7QtZU13BfGoDyTQ1oX918P8py22MJuMEwSuo",
          "assets": [
            {
              "tokenId": "064c58ea394d41fada074a3c560a132467adf4ca1512c409c014c625ca285e9c",
              "index": 0,
              "amount": 1,
              "name": null,
              "decimals": null,
              "type": null
            },
            {
              "tokenId": "a2a6c892c38d508a659caf857dbe29da4343371e597efd42e40f9bc99099a516",
              "index": 1,
              "amount": 9000,
              "name": "RSN",
              "decimals": 0,
              "type": "EIP-004"
            },
            {
              "tokenId": "0034c44f0c7a38f833190d44125ff9b3a0dd9dbb89138160182a930bc521db95",
              "index": 2,
              "amount": 18,
              "name": "SWSE",
              "decimals": 0,
              "type": "EIP-004"
            }
          ],
          "additionalRegisters": {},
          "spentTransactionId": "ce0208fb246f031d105ef48baeb45165dbcf201d06ecd2ea1cd3abb471864883",
          "mainChain": true
        },
        {
          "boxId": "158145208df21577e9832d7fbd3d945cf00b133b371acca53904380e7eeb6942",
          "transactionId": "d04fc93dc15a28a1f0e50b0fffc94f360037dcedddaf8a2e25905a892cd48378",
          "blockId": "6e74499171d828ee51266d3b65011cf958afe551ce7a0d74e5f6aba9029ae90c",
          "value": 1100000,
          "index": 2,
          "globalIndex": 548122,
          "creationHeight": 253476,
          "settlementHeight": 253478,
          "ergoTree": "1005040004000e36100204a00b08cd0279be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798ea02d192a39a8cc7a701730073011001020402d19683030193a38cc7b2a57300000193c2b2a57301007473027303830108cdeeac93b1a57304",
          "address": "2iHkR7CWvD1R4j1yZg5bkeDRQavjAaVPeTDFGGLZduHyfWMuYpmhHocX8GJoaieTx78FntzJbCBVL6rf96ocJoZdmWBL2fci7NqWgAirppPQmZ7fN9V6z13Ay6brPriBKYqLp1bT2Fk4FkFLCfdPpe",
          "assets": [],
          "additionalRegisters": {},
          "spentTransactionId": null,
          "mainChain": true
        }
      ],
      "size": 456
    }`;

  static mockWrongAmountRSNOnlyRewardTx = (
    boxIds: string[],
    watcherBoxes: string[],
    bridgeFeeErgoTree: string,
    networkFeeErgoTree: string,
    bankAddressErgoTree: string,
    tokenId: string,
    rsnTokenId: string
  ): string => `{
        "inputs": ${this.mockTransactionInputBoxes(boxIds)},
        "dataInputs": [],
        "outputs": [
            ${watcherBoxes.join(',')},
            {
                "value": 999300000,
                "ergoTree": "${bridgeFeeErgoTree}",
                "assets": [
                    {
                        "tokenId": "${rsnTokenId}",
                        "amount": 282011
                    }
                ],
                "additionalRegisters": {
                    "R4": "1a0120001b0f0ca1b87bf9444ff29c39efdf12b0061c67f42826e55f6d34f2479be7aa"
                },
                "creationHeight": 100000
            },
            {
                "value": 1500000,
                "ergoTree": "${networkFeeErgoTree}",
                "assets": [],
                "additionalRegisters": {},
                "creationHeight": 100000
            },
            {
                "value": 138997400000,
                "ergoTree": "${bankAddressErgoTree}",
                "assets": [
                    {
                        "tokenId": "907a31bdadad63e44e5b3a132eb5be218e694270fae6fa55b197ecccac19f87e",
                        "amount": 99
                    },
                    {
                        "tokenId": "${tokenId}",
                        "amount": 100
                    },
                    {
                        "tokenId": "${rsnTokenId}",
                        "amount": 9999529990
                    }
                ],
                "additionalRegisters": {},
                "creationHeight": 100000
            },
            ${this.mockTransactionFeeBox}
        ]
    }`;

  static mockWrongAmountRSNOnlyPaymentTx = (
    boxIds: string[],
    targetAddressErgoTree: string,
    watcherBoxes: string[],
    bridgeFeeErgoTree: string,
    networkFeeErgoTree: string,
    bankAddressErgoTree: string,
    tokenId: string,
    rsnTokenId: string
  ): string => `{
        "inputs": ${this.mockTransactionInputBoxes(boxIds)},
        "dataInputs": [],
        "outputs": [
            {
                "value": 48998500000,
                "ergoTree": "${targetAddressErgoTree}",
                "assets": [],
                "additionalRegisters": {},
                "creationHeight": 100000
            },
            ${watcherBoxes.join(',')},
            {
                "value": 999300000,
                "ergoTree": "${bridgeFeeErgoTree}",
                "assets": [
                    {
                        "tokenId": "db6df45d3ed738ff4ff48d3cdf50ba0e5c3018bc088430a33e700073d2390ba4",
                        "amount": 283001
                    }
                ],
                "additionalRegisters": {
                    "R4": "1a0100"
                },
                "creationHeight": 100000
            },
            {
                "value": 1500000,
                "ergoTree": "${networkFeeErgoTree}",
                "assets": [],
                "additionalRegisters": {},
                "creationHeight": 100000
            },
            {
                "value": 89998900000,
                "ergoTree": "${bankAddressErgoTree}",
                "assets": [
                    {
                        "tokenId": "907a31bdadad63e44e5b3a132eb5be218e694270fae6fa55b197ecccac19f87e",
                        "amount": 99
                    },
                    {
                        "tokenId": "${tokenId}",
                        "amount": 100
                    },
                    {
                        "tokenId": "${rsnTokenId}",
                        "amount": 9999529000
                    }
                ],
                "additionalRegisters": {},
                "creationHeight": 100000
            },
            ${this.mockTransactionFeeBox}
        ]
    }`;

  static mockAdditionalBoxColdStorageTx = (
    boxIds: string[],
    coldAddressErgoTree: string,
    lockAddressErgoTree: string
  ): string => `{
      "inputs": ${this.mockTransactionInputBoxes(boxIds)},
      "dataInputs": [],
      "outputs": [
        {
          "value": 676998800000,
          "ergoTree": "${coldAddressErgoTree}",
          "assets": [],
          "additionalRegisters": {},
          "creationHeight": 100000
        },
        {
          "value": 122000100000,
          "ergoTree": "${lockAddressErgoTree}",
          "assets": [
            {
              "tokenId": "0034c44f0c7a38f833190d44125ff9b3a0dd9dbb89138160182a930bc521db95",
              "amount": 2000000000
            },
            {
              "tokenId": "079532f131a0e3b99247c4be2371a34858f3f3134d1c1231b517c4da47ab901a",
              "amount": 1000000000
            },
            {
              "tokenId": "064c58ea394d41fada074a3c560a132467adf4ca1512c409c014c625ca285e9c",
              "amount": 110000000
            }
          ],
          "additionalRegisters": {},
          "creationHeight": 100000
        },
        {
          "value": 1000000000,
          "ergoTree": "${lockAddressErgoTree}",
          "assets": [
            {
              "tokenId": "064c58ea394d41fada074a3c560a132467adf4ca1512c409c014c625ca285e9c",
              "amount": 110000000
            }
          ],
          "additionalRegisters": {},
          "creationHeight": 100000
        },
        ${this.mockTransactionFeeBox}
      ]
    }`;

  static mockFineColdStorageTx = (
    boxIds: string[],
    coldAddressErgoTree: string,
    lockAddressErgoTree: string
  ): string => `{
      "inputs": ${this.mockTransactionInputBoxes(boxIds)},
      "dataInputs": [],
      "outputs": [
        {
          "value": 676998800000,
          "ergoTree": "${coldAddressErgoTree}",
          "assets": [],
          "additionalRegisters": {},
          "creationHeight": 100000
        },
        {
          "value": 123000100000,
          "ergoTree": "${lockAddressErgoTree}",
          "assets": [
            {
              "tokenId": "0034c44f0c7a38f833190d44125ff9b3a0dd9dbb89138160182a930bc521db95",
              "amount": 2000000000
            },
            {
              "tokenId": "079532f131a0e3b99247c4be2371a34858f3f3134d1c1231b517c4da47ab901a",
              "amount": 1000000000
            },
            {
              "tokenId": "064c58ea394d41fada074a3c560a132467adf4ca1512c409c014c625ca285e9c",
              "amount": 220000000
            }
          ],
          "additionalRegisters": {},
          "creationHeight": 100000
        },
        ${this.mockTransactionFeeBox}
      ]
    }`;

  static mockColdStorageTxWithRegister = (
    boxIds: string[],
    coldAddressErgoTree: string,
    lockAddressErgoTree: string
  ): string => `{
      "inputs": ${this.mockTransactionInputBoxes(boxIds)},
      "dataInputs": [],
      "outputs": [
        {
          "value": 676998800000,
          "ergoTree": "${coldAddressErgoTree}",
          "assets": [],
          "additionalRegisters": {},
          "creationHeight": 100000
        },
        {
          "value": 123000100000,
          "ergoTree": "${lockAddressErgoTree}",
          "assets": [
            {
              "tokenId": "0034c44f0c7a38f833190d44125ff9b3a0dd9dbb89138160182a930bc521db95",
              "amount": 2000000000
            },
            {
              "tokenId": "079532f131a0e3b99247c4be2371a34858f3f3134d1c1231b517c4da47ab901a",
              "amount": 1000000000
            },
            {
              "tokenId": "064c58ea394d41fada074a3c560a132467adf4ca1512c409c014c625ca285e9c",
              "amount": 220000000
            }
          ],
          "additionalRegisters": {
            "R4": {
              "serializedValue": "1a040763617264616e6f0a746f4164647265737334063130303030300432353030",
              "sigmaType": "Coll[Coll[SByte]]",
              "renderedValue": "[414441,746f4164647265737334,313030303030,32353030]"
            }
          },
          "creationHeight": 100000
        },
        ${this.mockTransactionFeeBox}
      ]
    }`;

  static mockColdStorageTxWithAdditionalFee = (
    boxIds: string[],
    coldAddressErgoTree: string,
    lockAddressErgoTree: string
  ): string => `{
      "inputs": ${this.mockTransactionInputBoxes(boxIds)},
      "dataInputs": [],
      "outputs": [
        {
          "value": 676998800000,
          "ergoTree": "${coldAddressErgoTree}",
          "assets": [],
          "additionalRegisters": {},
          "creationHeight": 100000
        },
        {
          "value": 123000000000,
          "ergoTree": "${lockAddressErgoTree}",
          "assets": [
            {
              "tokenId": "0034c44f0c7a38f833190d44125ff9b3a0dd9dbb89138160182a930bc521db95",
              "amount": 2000000000
            },
            {
              "tokenId": "079532f131a0e3b99247c4be2371a34858f3f3134d1c1231b517c4da47ab901a",
              "amount": 1000000000
            },
            {
              "tokenId": "064c58ea394d41fada074a3c560a132467adf4ca1512c409c014c625ca285e9c",
              "amount": 220000000
            }
          ],
          "additionalRegisters": {},
          "creationHeight": 100000
        },
        {
          "value": 1200000,
          "ergoTree": "1005040004000e36100204a00b08cd0279be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798ea02d192a39a8cc7a701730073011001020402d19683030193a38cc7b2a57300000193c2b2a57301007473027303830108cdeeac93b1a57304",
          "assets": [],
          "additionalRegisters": {},
          "creationHeight": 100000
        }
      ]
    }`;

  static mockLowErgColdStorageTx = (
    boxIds: string[],
    coldAddressErgoTree: string,
    lockAddressErgoTree: string
  ): string => `{
      "inputs": ${this.mockTransactionInputBoxes(boxIds)},
      "dataInputs": [],
      "outputs": [
        {
          "value": 677998800000,
          "ergoTree": "${coldAddressErgoTree}",
          "assets": [],
          "additionalRegisters": {},
          "creationHeight": 100000
        },
        {
          "value": 122000100000,
          "ergoTree": "${lockAddressErgoTree}",
          "assets": [
            {
              "tokenId": "0034c44f0c7a38f833190d44125ff9b3a0dd9dbb89138160182a930bc521db95",
              "amount": 2000000000
            },
            {
              "tokenId": "079532f131a0e3b99247c4be2371a34858f3f3134d1c1231b517c4da47ab901a",
              "amount": 1000000000
            },
            {
              "tokenId": "064c58ea394d41fada074a3c560a132467adf4ca1512c409c014c625ca285e9c",
              "amount": 220000000
            }
          ],
          "additionalRegisters": {},
          "creationHeight": 100000
        },
        ${this.mockTransactionFeeBox}
      ]
    }`;

  static mockLowTokenColdStorageTx = (
    boxIds: string[],
    coldAddressErgoTree: string,
    lockAddressErgoTree: string
  ): string => `{
      "inputs": ${this.mockTransactionInputBoxes(boxIds)},
      "dataInputs": [],
      "outputs": [
        {
          "value": 676998800000,
          "ergoTree": "${coldAddressErgoTree}",
          "assets": [
            {
              "tokenId": "0034c44f0c7a38f833190d44125ff9b3a0dd9dbb89138160182a930bc521db95",
              "amount": 1100000000
            }
          ],
          "additionalRegisters": {},
          "creationHeight": 100000
        },
        {
          "value": 123000100000,
          "ergoTree": "${lockAddressErgoTree}",
          "assets": [
            {
              "tokenId": "0034c44f0c7a38f833190d44125ff9b3a0dd9dbb89138160182a930bc521db95",
              "amount": 900000000
            },
            {
              "tokenId": "079532f131a0e3b99247c4be2371a34858f3f3134d1c1231b517c4da47ab901a",
              "amount": 1000000000
            },
            {
              "tokenId": "064c58ea394d41fada074a3c560a132467adf4ca1512c409c014c625ca285e9c",
              "amount": 220000000
            }
          ],
          "additionalRegisters": {},
          "creationHeight": 100000
        },
        ${this.mockTransactionFeeBox}
      ]
    }`;

  static mockHighErgColdStorageTx = (
    boxIds: string[],
    coldAddressErgoTree: string,
    lockAddressErgoTree: string
  ): string => `{
      "inputs": ${this.mockTransactionInputBoxes(boxIds)},
      "dataInputs": [],
      "outputs": [
        {
          "value": 176998800000,
          "ergoTree": "${coldAddressErgoTree}",
          "assets": [],
          "additionalRegisters": {},
          "creationHeight": 100000
        },
        {
          "value": 623000100000,
          "ergoTree": "${lockAddressErgoTree}",
          "assets": [
            {
              "tokenId": "0034c44f0c7a38f833190d44125ff9b3a0dd9dbb89138160182a930bc521db95",
              "amount": 2000000000
            },
            {
              "tokenId": "079532f131a0e3b99247c4be2371a34858f3f3134d1c1231b517c4da47ab901a",
              "amount": 1000000000
            },
            {
              "tokenId": "064c58ea394d41fada074a3c560a132467adf4ca1512c409c014c625ca285e9c",
              "amount": 220000000
            }
          ],
          "additionalRegisters": {},
          "creationHeight": 100000
        },
        ${this.mockTransactionFeeBox}
      ]
    }`;

  static randomMempoolTx = `
  {
    "id": "c3f6583a84b4a59efc5627bea013ac15088f736685d1865e865c47eb013bbc66",
    "creationTimestamp": 1664204480902,
    "inputs": [
      {
        "boxId": "24f7928811c65e63cc673ac4fc63fd75d75aac059ad0b7e262279cf70600235b",
        "value": 1100000,
        "index": 0,
        "spendingProof": null,
        "outputBlockId": "f6acea8792c6dd98610d5cf50c191160e7c907868077cf6d0347428bf6a58d88",
        "outputTransactionId": "6911f870b08015822ddd6009b62d626b4af7681f94ce0d5f262abe10752990a5",
        "outputIndex": 1,
        "ergoTree": "101c04000e20b02b20ae1630110f42406d81b2565d4e12001183ff9e00fd1d6bb8f74840f85904000200020004020400010004000400040004000400040604040402050205c8010500040204000400020004000400040204000400d80bd601b2a4730000d6027301d60393cbc272017202d604e4c6a7041ad6059572037201b2a5730200d606e4c67205041ad607c67205051ad608e67207d609957208b0e472078301027303d901093c0e0eb38c7209018c7209028301027304d60ab472097305b17209d60bb2a5730600957203d801d60cb2b5a5d9010c63d801d60ec6720c041a95e6720e93e4720e72047307730800d19683040193cbc2720ce4c6a7070e938cb2db6308720c730900018cb2db6308a7730a0001efae7206d9010d0e93720483010e720d93cbb3720ab27204730b00e4c6a7060ed801d60ccbc2720b9593720c7202d806d60db5a4d9010d6393c2a7c2720dd60eb1720dd60fb2db6501fe730c00d610e4c6720f0611d611b27210730d00d6129ab27210730e009d9cb27210730f00997eb1e4c6720f041a0573107311d19683080192c1720bb0ad720dd9011363c172137312d90113599a8c7213018c72130293b1b5720dd901136393e4c67213041a72047313ae7206d901130e9383010e7213720493e4c67205060ee4c6a7070e93b17206720e93cbb3720ab27204731400e4c6a7060e93e4c6a7051a83010e957208cbb2e472077315008301027316917e720e05958f7211721272117212d19683050193c5a7c57201938cb2db6308720b731700018cb2db6308a77318000193e4c6720b041a7204938cb2db6308b2a4731900731a0001b27204731b0093720ce4c6a7070e",
        "address": "58grLgCGkdh7fbQ1qZeeLH2f6XmtaYiYaLZA283UrKLHZfrCR1f5zm1K5FQyEmqXG3JF9s1JqD7Vu9GoA8r7zvrDLVFamSuFaC6pPk9Mr2yhRg2U7evjoABSzV5DHofUC7iVfGdd9zLMTQ24Z3pZ8hnY4FFp3Pa1iGWRn1Q21rbQgHu9kR5KHxH4KStsQmMmt1ruYViChZ1dMQmYJSrGisAHWog73ghmZHDb39Da4c5cm7frJnD4xBXUgPuFXo6F3WJ2v1ob4fc7juZC7dk7Fu49LN6WKo2NMg97v4gTRJDruJTX7dmAkWaV7EumowLZ363FGVrxNjHaNhATpbSW4a2hHcAHkLy1rsTNvAV4DnEE9PJHG8fBxynjMXKNCqeVuFJVpotYB8bVgix6xpX5rxzKVWJ7H8BPWe1NscsnFCgag8mRQcMCkTEqwq6a2vRJkJgwx4mnwyxJKFoT2TtYNfuyfieQVNZj1TLUKDCEp3FrxgtufjSm7MZH9umJj7qTdbFFo5hPXbirjuAA8CYbsqVq7d6GZhDyQkTQVpPmB9qhEKfHrjciVqEARkVEjeEzAdoPTjwqTc5G9HASg26jTKKUbQnrzoavGdaRD4Xo6jGeZULkM8W4e7YD18o1pBAtLYmj5LQQ7H2JtXBh84Gtyd5mJ8CueBg5UmHS8o9CHPj26y2RabrKBARzW2b3EyPMVVop13ar1GYx3FJQ4TbNE6WQEztmrCF8c1v9Yr55k3ErLyDmnDonbriwh3bLY8Kuo35LFmj1Rt2kXG5WGHQAuNqqnAZGY7aHJmiL82FxFtnq8DPVyWfyTqNg13ZFKQcuwEEqZhAk7yrpZKEjN",
        "assets": [],
        "additionalRegisters": {}
      },
      {
        "boxId": "b37f4d9b4e5df419254bf8ebea974a74a75e5cd1f2e79397ce084be305ffae4a",
        "value": 1100000,
        "index": 1,
        "spendingProof": null,
        "outputBlockId": "29344bbae793ed459fed6ab319ce618b3a77b4fe9c41fb7d7f8f067e4f4a24bf",
        "outputTransactionId": "4a61b347bc82b61f56904171423ebdaf9ebe1221f5f930e6910e3e69f6276c23",
        "outputIndex": 1,
        "ergoTree": "101c04000e20b02b20ae1630110f42406d81b2565d4e12001183ff9e00fd1d6bb8f74840f85904000200020004020400010004000400040004000400040604040402050205c8010500040204000400020004000400040204000400d80bd601b2a4730000d6027301d60393cbc272017202d604e4c6a7041ad6059572037201b2a5730200d606e4c67205041ad607c67205051ad608e67207d609957208b0e472078301027303d901093c0e0eb38c7209018c7209028301027304d60ab472097305b17209d60bb2a5730600957203d801d60cb2b5a5d9010c63d801d60ec6720c041a95e6720e93e4720e72047307730800d19683040193cbc2720ce4c6a7070e938cb2db6308720c730900018cb2db6308a7730a0001efae7206d9010d0e93720483010e720d93cbb3720ab27204730b00e4c6a7060ed801d60ccbc2720b9593720c7202d806d60db5a4d9010d6393c2a7c2720dd60eb1720dd60fb2db6501fe730c00d610e4c6720f0611d611b27210730d00d6129ab27210730e009d9cb27210730f00997eb1e4c6720f041a0573107311d19683080192c1720bb0ad720dd9011363c172137312d90113599a8c7213018c72130293b1b5720dd901136393e4c67213041a72047313ae7206d901130e9383010e7213720493e4c67205060ee4c6a7070e93b17206720e93cbb3720ab27204731400e4c6a7060e93e4c6a7051a83010e957208cbb2e472077315008301027316917e720e05958f7211721272117212d19683050193c5a7c57201938cb2db6308720b731700018cb2db6308a77318000193e4c6720b041a7204938cb2db6308b2a4731900731a0001b27204731b0093720ce4c6a7070e",
        "address": "58grLgCGkdh7fbQ1qZeeLH2f6XmtaYiYaLZA283UrKLHZfrCR1f5zm1K5FQyEmqXG3JF9s1JqD7Vu9GoA8r7zvrDLVFamSuFaC6pPk9Mr2yhRg2U7evjoABSzV5DHofUC7iVfGdd9zLMTQ24Z3pZ8hnY4FFp3Pa1iGWRn1Q21rbQgHu9kR5KHxH4KStsQmMmt1ruYViChZ1dMQmYJSrGisAHWog73ghmZHDb39Da4c5cm7frJnD4xBXUgPuFXo6F3WJ2v1ob4fc7juZC7dk7Fu49LN6WKo2NMg97v4gTRJDruJTX7dmAkWaV7EumowLZ363FGVrxNjHaNhATpbSW4a2hHcAHkLy1rsTNvAV4DnEE9PJHG8fBxynjMXKNCqeVuFJVpotYB8bVgix6xpX5rxzKVWJ7H8BPWe1NscsnFCgag8mRQcMCkTEqwq6a2vRJkJgwx4mnwyxJKFoT2TtYNfuyfieQVNZj1TLUKDCEp3FrxgtufjSm7MZH9umJj7qTdbFFo5hPXbirjuAA8CYbsqVq7d6GZhDyQkTQVpPmB9qhEKfHrjciVqEARkVEjeEzAdoPTjwqTc5G9HASg26jTKKUbQnrzoavGdaRD4Xo6jGeZULkM8W4e7YD18o1pBAtLYmj5LQQ7H2JtXBh84Gtyd5mJ8CueBg5UmHS8o9CHPj26y2RabrKBARzW2b3EyPMVVop13ar1GYx3FJQ4TbNE6WQEztmrCF8c1v9Yr55k3ErLyDmnDonbriwh3bLY8Kuo35LFmj1Rt2kXG5WGHQAuNqqnAZGY7aHJmiL82FxFtnq8DPVyWfyTqNg13ZFKQcuwEEqZhAk7yrpZKEjN",
        "assets": [],
        "additionalRegisters": {}
      },
      {
        "boxId": "c5df1884e457b44716258bbe645ba125963ef1354908bf8534555b42552d052c",
        "value": 9995600000,
        "index": 2,
        "spendingProof": "fe4ab537644102340ed6bd70d4e95facfbe9b8377b58a33b9a84b785d23f81291144f9fb50993abef990d966575a9f77481aba3b736adc5d",
        "outputBlockId": "29344bbae793ed459fed6ab319ce618b3a77b4fe9c41fb7d7f8f067e4f4a24bf",
        "outputTransactionId": "4a61b347bc82b61f56904171423ebdaf9ebe1221f5f930e6910e3e69f6276c23",
        "outputIndex": 2,
        "outputGlobalIndex": 632078,
        "outputCreatedAt": 295143,
        "outputSettledAt": 295145,
        "ergoTree": "0008cd020751cba011559c7af3531d951319ad60a81b42415aa974efddf8f9d8aa197446",
        "address": "9eaHUvGekJKwEkMBvBY1h2iM9z2NijA7PRhFLGruwvff3Uc7WvZ",
        "assets": [],
        "additionalRegisters": {}
      }
    ],
    "dataInputs": [],
    "outputs": [
      {
        "boxId": "5f43b1d96c01f46f4887e3a53b10db5143ff442909337491a5f1f7c842b96390",
        "transactionId": "c3f6583a84b4a59efc5627bea013ac15088f736685d1865e865c47eb013bbc66",
        "value": 2200000,
        "index": 0,
        "creationHeight": 295146,
        "ergoTree": "1007040004000e20c9a6742a45e261b7d3bee4124074ab011140af6ea4582f5989925756b18d4429040204000e205b81c74b04b7eed17bd1e3d37c990003183601951f22a3360a8bc5c848a320060e20ca82698f4294060b5702217169ee01c5afea4e76f89c63f4ac29296c3e4349fdd805d601e4c6a7041ad602b17201d603b4a573007202d604c2b2a5730100d605cb7204d196830301937202b17203afdc0c1d7201017203d901063c0e63d801d6088c720602ed9383010e8c720601e4c67208041a93c27208720495937205730296830201938cb2db6308b2a473030073040001730592a38cc7a70196830201aea4d901066393cbc272067306937205e4c6a7060e",
        "address": "TkeRZSqTYWwQSsZHt9htp4MyPLwhBcJYqFMj3xNjb4mQri8vrKrHAwALxjjCXBT8GY46Y95foAyLgZt91W5A1KHjSbnyzfYf8QByFSym56AFBxxCnKrWxL7Jdvd1uh5LwXjqjMZDLdcS4ACM6K4MRHh3qMQpjUTDJudTM4ZGoNwVVydm3g8JZmJvMozkyeCWCrRokS5ZMPbwQbwyLdhQSuVD1fcTDRqy8daboVNSarkzoxKi7jMw7pWTdtJRzfvkcQEqiprByhd31f2BxXuug2wjYxJWbVUJPwGobR1ifuxG11t5dwCjk7EHm6FsDoV1v79SiULnGf8ANVGJDD2Kf49D29ZbUdzYFJeomYFRe",
        "assets": [],
        "additionalRegisters": {},
        "spentTransactionId": null,
        "mainChain": true
      },
      {
        "boxId": "f3d57c4c7e1903f6762cdba64fa9e2e7bb1dc84733cd0aa3785dcb6706b3d039",
        "transactionId": "c3f6583a84b4a59efc5627bea013ac15088f736685d1865e865c47eb013bbc66",
        "value": 9994500000,
        "index": 1,
        "creationHeight": 295146,
        "ergoTree": "0008cd020751cba011559c7af3531d951319ad60a81b42415aa974efddf8f9d8aa197446",
        "address": "9eaHUvGekJKwEkMBvBY1h2iM9z2NijA7PRhFLGruwvff3Uc7WvZ",
        "assets": [],
        "additionalRegisters": {},
        "spentTransactionId": "df27a46e82456f036787aea12365b3b8d09618b1efb0918adee89fe0c577816d",
        "mainChain": true
      },
      {
        "boxId": "b38b2f8188c4fd18d7dc2479d8ea2e7192e2453c2727ed48fe6683a9dd215b45",
        "transactionId": "c3f6583a84b4a59efc5627bea013ac15088f736685d1865e865c47eb013bbc66",
        "value": 1100000,
        "index": 2,
        "creationHeight": 295146,
        "ergoTree": "1005040004000e36100204a00b08cd0279be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798ea02d192a39a8cc7a701730073011001020402d19683030193a38cc7b2a57300000193c2b2a57301007473027303830108cdeeac93b1a57304",
        "address": "2iHkR7CWvD1R4j1yZg5bkeDRQavjAaVPeTDFGGLZduHyfWMuYpmhHocX8GJoaieTx78FntzJbCBVL6rf96ocJoZdmWBL2fci7NqWgAirppPQmZ7fN9V6z13Ay6brPriBKYqLp1bT2Fk4FkFLCfdPpe",
        "assets": [],
        "additionalRegisters": {},
        "spentTransactionId": null,
        "mainChain": true
      }
    ],
    "size": 1185
  }`;

  static mockMempoolTx = (
    txId: string,
    boxId: string,
    boxErgoTree: string,
    boxAddress: string,
    targetBoxJson: string
  ): string => `
  {
    "id": "${txId}",
    "creationTimestamp": 1664204480902,
    "inputs": [
      {
        "boxId": "${boxId}",
        "value": 1100000,
        "index": 0,
        "spendingProof": null,
        "outputBlockId": "f6acea8792c6dd98610d5cf50c191160e7c907868077cf6d0347428bf6a58d88",
        "outputTransactionId": "6911f870b08015822ddd6009b62d626b4af7681f94ce0d5f262abe10752990a5",
        "outputIndex": 1,
        "ergoTree": "${boxErgoTree}",
        "address": "${boxAddress}",
        "assets": [],
        "additionalRegisters": {}
      }
    ],
    "dataInputs": [],
    "outputs": [
      {
        "boxId": "5f43b1d96c01f46f4887e3a53b10db5143ff442909337491a5f1f7c842b96390",
        "transactionId": "c3f6583a84b4a59efc5627bea013ac15088f736685d1865e865c47eb013bbc66",
        "value": 2200000,
        "index": 0,
        "creationHeight": 295146,
        "ergoTree": "1007040004000e20c9a6742a45e261b7d3bee4124074ab011140af6ea4582f5989925756b18d4429040204000e205b81c74b04b7eed17bd1e3d37c990003183601951f22a3360a8bc5c848a320060e20ca82698f4294060b5702217169ee01c5afea4e76f89c63f4ac29296c3e4349fdd805d601e4c6a7041ad602b17201d603b4a573007202d604c2b2a5730100d605cb7204d196830301937202b17203afdc0c1d7201017203d901063c0e63d801d6088c720602ed9383010e8c720601e4c67208041a93c27208720495937205730296830201938cb2db6308b2a473030073040001730592a38cc7a70196830201aea4d901066393cbc272067306937205e4c6a7060e",
        "address": "TkeRZSqTYWwQSsZHt9htp4MyPLwhBcJYqFMj3xNjb4mQri8vrKrHAwALxjjCXBT8GY46Y95foAyLgZt91W5A1KHjSbnyzfYf8QByFSym56AFBxxCnKrWxL7Jdvd1uh5LwXjqjMZDLdcS4ACM6K4MRHh3qMQpjUTDJudTM4ZGoNwVVydm3g8JZmJvMozkyeCWCrRokS5ZMPbwQbwyLdhQSuVD1fcTDRqy8daboVNSarkzoxKi7jMw7pWTdtJRzfvkcQEqiprByhd31f2BxXuug2wjYxJWbVUJPwGobR1ifuxG11t5dwCjk7EHm6FsDoV1v79SiULnGf8ANVGJDD2Kf49D29ZbUdzYFJeomYFRe",
        "assets": [],
        "additionalRegisters": {},
        "spentTransactionId": null,
        "mainChain": true
      },
      {
        "boxId": "f3d57c4c7e1903f6762cdba64fa9e2e7bb1dc84733cd0aa3785dcb6706b3d039",
        "transactionId": "c3f6583a84b4a59efc5627bea013ac15088f736685d1865e865c47eb013bbc66",
        "value": 9994500000,
        "index": 1,
        "creationHeight": 295146,
        "ergoTree": "0008cd020751cba011559c7af3531d951319ad60a81b42415aa974efddf8f9d8aa197446",
        "address": "9eaHUvGekJKwEkMBvBY1h2iM9z2NijA7PRhFLGruwvff3Uc7WvZ",
        "assets": [],
        "additionalRegisters": {},
        "spentTransactionId": "df27a46e82456f036787aea12365b3b8d09618b1efb0918adee89fe0c577816d",
        "mainChain": true
      },
      ${targetBoxJson}
    ],
    "size": 1185
  }`;

  static signedErgoTransaction = `{
    "network": "ergo",
    "txId": "f4e000e3184b242427f79fd146ceb5acdddaf497d9ede5deeb86cb8a7498dd38",
    "eventId": "92e136daec1c82a6e9c9bab84a69b519e17ed16cd3307e35a721783114aba15c",
    "txBytes": "032bf2ba4a961d54ef0faa278da326e896a1e43d9c2a57a8c3b0f120150dfcba3900008800e3a9e614bfffa3d031e519d5348b14a023c0af0f9a3ab18241eef86cc7709001d575705db7a835a3bf81d31cadccf0a9a2808f446f98621ee7bd9ba3f28a9ee6d7a47b0523bff3c9948f6009c2df1acc7e5f75822e6a12b4db006f3b141a13098f9add82230ada7a74bc0ab62b9762e473d776210c0b1d39ce707db5c17a032a51d2b96b13b8408023f1b5438c463bd9dc4c6c46be7a6c67c001408ed869fc0b6312668f4bdfa4bbc3239d59a2e5702000579c468a4e36d41e7c5023ebc4963fd344ac269beb33f63f39d19fe2b14a55cf9001d5d3e6a6bf4ca767162a48c6974a7a46d660362b67fb83ca4938de3bd37bf2e62270047684152508294d48d760ab1f2cf6667b156848f3d866b6de498406786ccb45d0c0147d56eb7075394129d012b54817bf781fbe04cd3f80d66c92163542f90b49a0687b8e44b4984a3404a1686c58080cfb3c0995ceb255c8bf9e4168adf015b0af1e028c201dcef2ef550b11ba0001c095d370d034aca2f62403d1a50e904dfb4aa9b2cf129c836c7a9333d129f76405497287b9a1eff643791277744a74b7d598b834dc613f2ebc972e33767c61ac2b58e8ee406cbd6d8b192dd64adff64eebe9336e2e673993916ccbbd6455f6911fa2a6c892c38d508a659caf857dbe29da4343371e597efd42e40f9bc99099a51603689941746717cddd05c52f454e34eb6e203a84f931fdc47c52f44589f834960034c44f0c7a38f833190d44125ff9b3a0dd9dbb89138160182a930bc521db9505e0a71210130400040004040400040204000e20a29d9bb0d622eb8b4f83a34c4ab1b7d3f18aaaabc3aa6876912a3ebaf0da10180404040004000400010104020400040004000e2064cc72f329f5db7b69667a10af3e1726161b9b7ce918a794ea80b9c32c4ce38805020101d807d601b2a5730000d6028cb2db6308a773010001d603aeb5b4a57302b1a5d901036391b1db630872037303d9010363aedb63087203d901054d0e938c7205017202d604e4c6a7041ad605b2a5730400d606db63087205d607ae7206d901074d0e938c720701720295938cb2db63087201730500017306d196830301ef7203938cb2db6308b2a473070073080001b2720473090095720796830201938cb27206730a0001720293c27205c2a7730bd801d608c2a7d196830501ef720393c27201720893e4c67201041a7204938cb2db6308b2a4730c00730d0001b27204730e00957207d801d609b27206730f0096830701938c720901720293cbc272057310e6c67205051ae6c67205060e93e4c67205070ecb720893e4c67205041a7204938c72090273117312addc11030001018092f40102c0b802011a0120a337e33042eaa1da67bcc7dfa5fcc444f63b8a695c9786494d7d22293eba542ee0a7120008cd033e819e995909938ea0070ee8af357693938220540f9ca5443fd8253a21d101e3addc110201a0fcd50302c0b80200e0a7120008cd02e7c7c9ff46e5a3390e9f5546013de6700484c59086de40a6f62eabaf18c13483addc11010180897a0080ebbcd607100304000e20a6ac381e6fa99929fd1477b3ba9499790a775e91d4c14c5aa86e9a118dfac8530400d801d601b2db6501fe730000ea02d1aedb63087201d901024d0e938c720201730198b2e4c672010510730200ade4c67201041ad901020ecdee7202addc110402d2a10103d694060180fde80704a10b00e091431005040004000e36100204a00b08cd0279be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798ea02d192a39a8cc7a701730073011001020402d19683030193a38cc7b2a57300000193c2b2a57301007473027303830108cdeeac93b1a57304addc110000",
    "txType": "reward",
    "inputBoxes": [
      "e091431007040004000e20c9a6742a45e261b7d3bee4124074ab011140af6ea4582f5989925756b18d4429040204000e205b81c74b04b7eed17bd1e3d37c990003183601951f22a3360a8bc5c848a320060e20ca82698f4294060b5702217169ee01c5afea4e76f89c63f4ac29296c3e4349fdd805d601e4c6a7041ad602b17201d603b4a573007202d604c2b2a5730100d605cb7204d196830301937202b17203afdc0c1d7201017203d901063c0e63d801d6088c720602ed9383010e8c720601e4c67208041a93c27208720495937205730296830201938cb2db6308b2a473030073040001730592a38cc7a70196830201aea4d901066393cbc272067306937205e4c6a7060eb4ad1101497287b9a1eff643791277744a74b7d598b834dc613f2ebc972e33767c61ac2b01031a0120a337e33042eaa1da67bcc7dfa5fcc444f63b8a695c9786494d7d22293eba542e1a0b4064373861356165333536356432663264356362356333646235303133336130383766623566353264616634623566376564383865623666653335623661663063046572676f0763617264616e6f0b66726f6d416464726573733f616464725f7465737431767a6730376432717033786a6530773737663938327a6b687165793530676a787273647168383979783872376e6173753937687230080000000001c9c3800800000000007a12000800000000001e84804035386538656534303663626436643862313932646436346164666636346565626539333336653265363733393933393136636362626436343535663639313166086c6f76656c61636540386633373539663438336537373864306433326662383034633465343732343862643731306533363936623134643631356430323962343237616330306337310e2012a8eb76bd00653da26d9af3a3660d587ddbe90f54b71ec9a505222eaa009534c84dab1284b624a2fdcb606bd5c3439f3b1f281ffc1e7f14180fce3e3d058e4700",
      "80ade204100304000e20a6ac381e6fa99929fd1477b3ba9499790a775e91d4c14c5aa86e9a118dfac8530400d801d601b2db6501fe730000ea02d1aedb63087201d901024d0e938c720201730198b2e4c672010510730200ade4c67201041ad901020ecdee7202abdc1101a2a6c892c38d508a659caf857dbe29da4343371e597efd42e40f9bc99099a516a08d060016ea10f2848b4e139bba6b899ef84b0cd5a7ba6afa9a027ef3957edc33f55e4600",
      "a0b591d207100304000e20a6ac381e6fa99929fd1477b3ba9499790a775e91d4c14c5aa86e9a118dfac8530400d801d601b2db6501fe730000ea02d1aedb63087201d901024d0e938c720201730198b2e4c672010510730200ade4c67201041ad901020ecdee7202bed0110403689941746717cddd05c52f454e34eb6e203a84f931fdc47c52f44589f83496d6940658e8ee406cbd6d8b192dd64adff64eebe9336e2e673993916ccbbd6455f6911fa094ad0e0034c44f0c7a38f833190d44125ff9b3a0dd9dbb89138160182a930bc521db95a10ba2a6c892c38d508a659caf857dbe29da4343371e597efd42e40f9bc99099a516b20500e62bb6c72b2c380b68a24c48b2f91424beb99271f8cc421b6782bc09828d196c03"
    ],
    "dataInputs": [
      "e09143100504000400040004000402d802d601c2a7d602b2a5730000ea02d196830301937201c2b2a473010093c272027201938cb2db63087202730200018cb2db6308a77303000198b2e4c6a70510730400ade4c6a7041ad901030ecdee7203cdfb1001a6ac381e6fa99929fd1477b3ba9499790a775e91d4c14c5aa86e9a118dfac85301021a032102299bbf9b7481dce78c0b6559194a385811af1ffdf6d905671c1c82882b114a6921026e558b0a51dd7f7c3d896ecc3ed0f515d8108dd6afa2e2c6b2d6bb7585ab7aca2102b72f60c0554b710a79721b63d3d2cc4840934c92a74601a3461f8ac2185c59c21002040494d94d8e5cd0dcf8f71d0240243aab4205243d2b592fb9424b634af5beda533b00"
    ]
  }`;

  static fineTokenRewardDistributionTxString = (
    boxIds: string[],
    watcherBoxes: string[],
    bridgeFeeErgoTree: string,
    networkFeeErgoTree: string,
    bankAddressErgoTree: string
  ): string => `{
        "inputs": ${this.mockTransactionInputBoxes(boxIds)},
        "dataInputs": [],
        "outputs": [
            ${watcherBoxes.join(',')},
            {
                "value": 100000,
                "ergoTree": "${bridgeFeeErgoTree}",
                "assets": [
                    {
                        "tokenId": "907a31bdadad63e44e5b3a132eb5be218e694270fae6fa55b197ecccac19f87e",
                        "amount": 13
                    }
                ],
                "additionalRegisters": {
                    "R4": "1a0120001b0f0ca1b87bf9444ff29c39efdf12b0061c67f42826e55f6d34f2479be7aa"
                },
                "creationHeight": 100000
            },
            {
                "value": 100000,
                "ergoTree": "${networkFeeErgoTree}",
                "assets": [
                    {   
                        "tokenId": "907a31bdadad63e44e5b3a132eb5be218e694270fae6fa55b197ecccac19f87e",
                        "amount": 5
                    }
                ],
                "additionalRegisters": {},
                "creationHeight": 100000
            },
            {
                "value": 139998700000,
                "ergoTree": "${bankAddressErgoTree}",
                "assets": [
                    {
                        "tokenId": "907a31bdadad63e44e5b3a132eb5be218e694270fae6fa55b197ecccac19f87e",
                        "amount": 74
                    },
                    {
                        "tokenId": "e2b7b6ab2a7c6dfc6a82cc648f3b16b76db1cf19e93b7ac35a4898c06e4d08ce",
                        "amount": 100
                    },
                    {
                        "tokenId": "a2a6c892c38d508a659caf857dbe29da4343371e597efd42e40f9bc99099a516",
                        "amount": 10000000000
                    }
                ],
                "additionalRegisters": {},
                "creationHeight": 100000
            },
            ${this.mockTransactionFeeBox}
        ]
    }`;

  static sampleExplorerTransaction = `{
    "id": "03f02e4d72f1c4c13b9c3de1b96ecca992c0c4b1a2b33ac5b23be72e2f7909e2",
    "blockId": "5f4961ebf5451b0d85e335ab6390c108b993243d08b8728afb4e771f3e6aec79",
    "inclusionHeight": 945134,
    "timestamp": 1676981593346,
    "index": 47,
    "globalIndex": 4795275,
    "numConfirmations": 1449,
    "inputs": [
      {
        "boxId": "e40c4ab3827bd22414c2c11958dcfac6ca7615fdf26a31aff24d4909151572d1",
        "value": 11000000,
        "index": 0,
        "spendingProof": null,
        "outputBlockId": "fa1964deed9cd135fea5557e242ffcb5195f8f7c04be254d79410568900554eb",
        "outputTransactionId": "4924c212ec7a28d01f7b1cb9c0247e584fb39907642749e1f225cadf799b47ec",
        "outputIndex": 0,
        "outputGlobalIndex": 26777230,
        "outputCreatedAt": 945108,
        "outputSettledAt": 945111,
        "ergoTree": "1008040004000e20b7f09c1b0a974d6699a9593a286808ad12748fa8025ab9adcb24375e0395f815040204000e2037080ea7925c407965f27013fe66d2e7d692e68dc0de9219effe4819cea8c7b304c0700e206a1a0cf61ec4148916281e6d82a1d17a60eed7845200401d5231377f4643ba67d805d601e4c6a7041ad602b17201d603b4a573007202d604c2b2a5730100d605cb7204d196830301937202b17203afdc0c1d7201017203d901063c0e63d801d6088c720602ed9383010e8c720601e4c67208041a93c27208720495937205730296830201938cb2db6308b2a47303007304000173059299a373068cc7a70196830201aea4d901066393cbc272067307937205e4c6a7060e",
        "address": "21oSXpSmAC6qp2H72o1YW4D9Dxq3mSkee28gWAFqqd9NRTx15VHM6RwVxScoDnN4jiTegJvto6yK4rZDV788EKrJdoftYXVdQDaeakfgJJhLSfpJcadGZLLwJQkpoRJpesAgY8QfkuyLTkVNbNNshvsA4x3kfvPFDGDQfn8AdN6hJ1FnibRdcj3uY9NQTjjLWNGb1XNdUQyGv73qBJobfaRm9GyXzk9wUq54VhKdcxzTjzuJTtCCv2cxBXKup4EzEEXDNWLcfsD8bNknob5bmUDuTGszsPZHcwAwXgcqsxKvcki7KUs7d666iyu5fNgvFTx8B3D1ageWpAD5RcBbmfiGNEL9k7BnwWiP2pU5DwhJzWH3iU",
        "assets": [
          {
            "tokenId": "383d70ab083cc23336a46370fe730b2c51db0e831586b6d545202cbc33938ee1",
            "index": 0,
            "amount": 10,
            "name": "Ergo-RWT-V.beta",
            "decimals": 0,
            "type": "EIP-004"
          }
        ],
        "additionalRegisters": {
          "R4": {
            "serializedValue": "1a0a20846f72637b75f4817eb3f6e8542cb2d92875cf1ddce0fd5b734fc7c9bb48ac6020c1f5aa4b1a713396a63f556df49c70add93b3471cbca893c6146fce5a4b95e7620101f5f0995d90c80a9491815571ed1c9fc5522922fa3bbccbd575d1aa7255f9020e39047fa7025f5eb94f0b1a9d6d4728b5a4270ea1155e4e5b0e265db46589d5c20d206d6f37bc63fae26fbb591d5d4b60181db35fb712ae6dfa2c5faf0078d66eb20e09921d0a87bb63e94aa6074c090a903a280ebd8cfba862396e56668f7138fe120da06f26f55cca0ad06880e0e8fe40d4011373e526f6aafe47caba8f5fa16970720ed6b8b63d187198f3ba55468231b5c83c050f7273364211fcf3b1ca7526ff30220730488119f223822c77c9c89fa73e1794116dd1503fcabf3fc9217ffe7b7b50820d4e03eda58a338f8f65b40de258407dbdbbd9b8ccca374f66be8d97e52c8a752",
            "sigmaType": "Coll[Coll[SByte]]",
            "renderedValue": "[846f72637b75f4817eb3f6e8542cb2d92875cf1ddce0fd5b734fc7c9bb48ac60,c1f5aa4b1a713396a63f556df49c70add93b3471cbca893c6146fce5a4b95e76,101f5f0995d90c80a9491815571ed1c9fc5522922fa3bbccbd575d1aa7255f90,e39047fa7025f5eb94f0b1a9d6d4728b5a4270ea1155e4e5b0e265db46589d5c,d206d6f37bc63fae26fbb591d5d4b60181db35fb712ae6dfa2c5faf0078d66eb,e09921d0a87bb63e94aa6074c090a903a280ebd8cfba862396e56668f7138fe1,da06f26f55cca0ad06880e0e8fe40d4011373e526f6aafe47caba8f5fa169707,ed6b8b63d187198f3ba55468231b5c83c050f7273364211fcf3b1ca7526ff302,730488119f223822c77c9c89fa73e1794116dd1503fcabf3fc9217ffe7b7b508,d4e03eda58a338f8f65b40de258407dbdbbd9b8ccca374f66be8d97e52c8a752]"
          },
          "R5": {
            "serializedValue": "1a0c4030323536376662343336376531353162343438363233613235353463383438323039646466343262363737303865663832333537363262363065653130333465046572676f0763617264616e6f3339685a785633594e536662437153364745736573374468415653617476616f4e746473694e766b696d504747326338667a6b4767616464723171797267727068647379376c746132726165327075386870356d7732666e7076753873653030727861367a7a6d63347368346779666b646870776671386c6e68356c39353636336430396e337339637275746e63397977616d637671733565356d360800000000275667ae08000000000bebc2000800000000000f4240036572672c617373657431703430723065756e32616c737a6c78686a376b3475796c796134636a35346c786b6a6a6d736d40333639623131313465353161653662393439663230666432383332393762363463396366313133316161636630306530393939356138306630613036373333660800000000000e6bc7",
            "sigmaType": "Coll[Coll[SByte]]",
            "renderedValue": "[30323536376662343336376531353162343438363233613235353463383438323039646466343262363737303865663832333537363262363065653130333465,6572676f,63617264616e6f,39685a785633594e536662437153364745736573374468415653617476616f4e746473694e766b696d504747326338667a6b47,616464723171797267727068647379376c746132726165327075386870356d7732666e7076753873653030727861367a7a6d63347368346779666b646870776671386c6e68356c39353636336430396e337339637275746e63397977616d637671733565356d36,00000000275667ae,000000000bebc200,00000000000f4240,657267,617373657431703430723065756e32616c737a6c78686a376b3475796c796134636a35346c786b6a6a6d736d,33363962313131346535316165366239343966323066643238333239376236346339636631313331616163663030653039393935613830663061303637333366,00000000000e6bc7]"
          },
          "R6": {
            "serializedValue": "0e20ed7f723921f2efd4ec2fbc6a1262376e346c130e6aff4daf63addfe996f2d71c",
            "sigmaType": "Coll[SByte]",
            "renderedValue": "ed7f723921f2efd4ec2fbc6a1262376e346c130e6aff4daf63addfe996f2d71c"
          }
        }
      },
      {
        "boxId": "0d491319f26fc576f495b3116b6ed0f3144a8a2b63ffb61f64cc0e20375cbe0f",
        "value": 1000000,
        "index": 1,
        "spendingProof": "f5fd95c0f554c3f11c2afca140c981066270f3a1568c0f4b29c5d8b93c8d9d0c26d5f0b73e4a96dafa45e48acda7c70f71b4bb47ae9ed3d0f05a906c7d72fa9b70096b35a96fec3a784806a0e55170d5b72210f1fe6fd42efe6f0e8cf0c89b7b3e4cd40e9a5237b90ffc1642a9423cf61ab78e481fa1fd63ed09b92f425e4308e297d6609a7314adb86405ef29286076e7dfbe3a2bbcd1bad77165de3becb4471ecb8577637720d1cb9a32855cac2119fff807ff491f6c4c53788c4bd8051a94c614c997b583ccc5e389234389f01e76351c9363624fe58dbb6d4d110d85145ec13ce837bb6ccdf28c5d99de70c09651e3ec0d5db44fd2bb9b2c89567f8b1305645271f04cf34910d1d02a97b19774ddcde4db053c9b2ff551bfd7abf91c875505ae6c23331981956e84a066786ab6fe17b56781afdc0eb27504d155197de75e03aa9382cb14da8b3e3a7947948b03267c4ed5b0e0d42f6b1c84a2b7588cc1b571ccfac947c5d72f123c120c7988f8496166be1ae4e12a64eb2468420f8ec7d6282debf4df5f49c0e98ef870a115a908e60778ff84d2b6337dd1b40b554e181f",
        "outputBlockId": "b44671b510889f17d21c697541cc43812e851d7c26534ddc1f814b364ab79c29",
        "outputTransactionId": "07243a591ed8963ef7613eb94e893bd49d60c25b493b20d7017865b82d80ea2c",
        "outputIndex": 0,
        "outputGlobalIndex": 26778177,
        "outputCreatedAt": 945124,
        "outputSettledAt": 945126,
        "ergoTree": "100304000e20a96b8049f0741c7255b60cf01954439d2e4b2d19ae7d8ebc688ecb190a33b5380400d801d601b2db6501fe730000ea02d1aedb63087201d901024d0e938c720201730198b2e4c672010510730200ade4c67201041ad901020ecdee7202",
        "address": "nB3L2PD3LG4ydEj62n9aymRyPCEbkBdzaubgvCWDH2oxHxFBfAUy9GhWDvteDbbUh5qhXxnW8R46qmEiZfkej8gt4kZYvbeobZJADMrWXwFJTsZ17euEcoAp3KDk31Q26okFpgK9SKdi4",
        "assets": [
          {
            "tokenId": "fc6c2070eb004fc08fcde1514dee56b1d0587477748d8af647179b098f52f559",
            "index": 0,
            "amount": 4797929,
            "name": "RsADA",
            "decimals": 0,
            "type": "EIP-004"
          }
        ],
        "additionalRegisters": {
          "R4": {
            "serializedValue": "1a050763617264616e6f67616464723171797267727068647379376c746132726165327075386870356d7732666e7076753873653030727861367a7a6d63347368346779666b646870776671386c6e68356c39353636336430396e337339637275746e63397977616d637671733565356d360634303030303007323030303030303339685a785633594e536662437153364745736573374468415653617476616f4e746473694e766b696d504747326338667a6b47",
            "sigmaType": "Coll[Coll[SByte]]",
            "renderedValue": "[63617264616e6f,616464723171797267727068647379376c746132726165327075386870356d7732666e7076753873653030727861367a7a6d63347368346779666b646870776671386c6e68356c39353636336430396e337339637275746e63397977616d637671733565356d36,343030303030,32303030303030,39685a785633594e536662437153364745736573374468415653617476616f4e746473694e766b696d504747326338667a6b47]"
          }
        }
      }
    ],
    "dataInputs": [
      {
        "boxId": "350bff7491aa9bf828a922fd8f50df0191c6ae586cb077d84b9caef5dd96cfbc",
        "value": 1100000,
        "index": 0,
        "outputBlockId": "a7aeaa064590253e9f07e63a64d86b5d08c9508f9da13ccac29723e98eb7a0d6",
        "outputTransactionId": "e3f3794c3bfe63a88a2703a2588bce143bdc40fbd06bbdb469bbfaf00cf4eb35",
        "outputIndex": 0,
        "ergoTree": "100504000400040004000402d802d601c2a7d602b2a5730000ea02d196830301937201c2b2a473010093c272027201938cb2db63087202730200018cb2db6308a77303000198b2e4c6a70510730400ade4c6a7041ad901030ecdee7203",
        "address": "MZ4DGXjbMTDYv4wnEPCSzRGp3infV4oBqQvJhnnePTb61wYrGaS2oiNAbesgJphKS3v5tA3cqaEXUdgRP5EsKBihXwSSogs4RNVhhsYyQiYHoWNo3jB7Fm2DDQSVLJZCf41sd",
        "assets": [],
        "additionalRegisters": {
          "R4": {
            "serializedValue": "1a0a2102db3849f655693c28e3c44ededd546c6c3267b6f90c0f9ad9785061c387ca2e69210249e1b4b331b93481cc812c024f1f8a198fe078895ad7f03ab890bd4e81fb590721020e106e606e70e426a19900f42f3210420f53498c9956106d30b1837596dbc4512102ddd718f3080a04c2e9f2016dc13153f65d64da83ccfea433139c89236476e2b72102e2c106d43c57936310f06d4fea9f6940dbf1c4e32cb99bdd7ac7b7714e54527121032bb38046b67ed49aa6f4d255bbe1c098ff2f7b682f9922a2a376862de266b16e2103c3374d06b092583835a3a93c7acbc6c449656881abff5d6b17df456a7f3d618b2102956d0fd87b81ebe8ea4763a64e126a548adef2eec3a9719683944100cb992bc52102b980e0cbb817f80163485aea9ce59c3d6249d510733002a9fc6843718a540b072103d7e6475ef5ceb9b0e9b0cad722c9cbfa3a13e8e94188ac963e11e4e66e9eaa2c",
            "sigmaType": "Coll[Coll[SByte]]",
            "renderedValue": "[02db3849f655693c28e3c44ededd546c6c3267b6f90c0f9ad9785061c387ca2e69,0249e1b4b331b93481cc812c024f1f8a198fe078895ad7f03ab890bd4e81fb5907,020e106e606e70e426a19900f42f3210420f53498c9956106d30b1837596dbc451,02ddd718f3080a04c2e9f2016dc13153f65d64da83ccfea433139c89236476e2b7,02e2c106d43c57936310f06d4fea9f6940dbf1c4e32cb99bdd7ac7b7714e545271,032bb38046b67ed49aa6f4d255bbe1c098ff2f7b682f9922a2a376862de266b16e,03c3374d06b092583835a3a93c7acbc6c449656881abff5d6b17df456a7f3d618b,02956d0fd87b81ebe8ea4763a64e126a548adef2eec3a9719683944100cb992bc5,02b980e0cbb817f80163485aea9ce59c3d6249d510733002a9fc6843718a540b07,03d7e6475ef5ceb9b0e9b0cad722c9cbfa3a13e8e94188ac963e11e4e66e9eaa2c]"
          },
          "R5": {
            "serializedValue": "10020e10",
            "sigmaType": "Coll[SInt]",
            "renderedValue": "[7,8]"
          }
        }
      }
    ],
    "outputs": [
      {
        "boxId": "2ccb2f54cd2b48a3f929f4499b1abdb18c161d768b847eabcf9beb103a08a009",
        "transactionId": "03f02e4d72f1c4c13b9c3de1b96ecca992c0c4b1a2b33ac5b23be72e2f7909e2",
        "blockId": "5f4961ebf5451b0d85e335ab6390c108b993243d08b8728afb4e771f3e6aec79",
        "value": 300000,
        "index": 0,
        "globalIndex": 26779509,
        "creationHeight": 945129,
        "settlementHeight": 945134,
        "ergoTree": "10130400040004040400040204000e203ac8a90d0aa8c5c50e99dd2588a990fd37b5d3aee70e32d56241f41ed49e9f030404040004000400010104020400040004000e2026083658fce2ae5b9848ad00b7d72878ca84394a47294460d11c43fa1bae738d05020101d807d601b2a5730000d6028cb2db6308a773010001d603aeb5b4a57302b1a5d901036391b1db630872037303d9010363aedb63087203d901054d0e938c7205017202d604e4c6a7041ad605b2a5730400d606db63087205d607ae7206d901074d0e938c720701720295938cb2db63087201730500017306d196830301ef7203938cb2db6308b2a473070073080001b2720473090095720796830201938cb27206730a0001720293c27205c2a7730bd801d608c2a7d196830501ef720393c27201720893e4c67201041a7204938cb2db6308b2a4730c00730d0001b27204730e00957207d801d609b27206730f0096830701938c720901720293cbc272057310e6c67205051ae6c67205060e93e4c67205070ecb720893e4c67205041a7204938c72090273117312",
        "address": "EE7687i4URb4YuSGSQXPCb7UQgHfhJPtKCU7fZmQpof644wX74ZGWnGcLbxxWnLKb8cQnFxkZF1WWeTgmfjEhuAoF2QaMRXg3qdtFZEoKEzfRrMh8Nb7u5GWjEbN1yjQ86PF73Zoo2PeFGotN628Dbm3bPnZhysUcz8pTrQc6BoW32mD9w5jhZRdA7YdP4mzgvsnC7oVWATNA5hgqiKskJxSgvcE63xuG4HdPZb4qakyKRgppndQmDtXNTs7NMBTSFH6Vd9Yqp4TE4MAHMzpWP8iJDSamXS4ppXXeb9sRT5iAS9c2H4atBAkYQ8ntni8C5Wyaz3poq9AaoCxPc1e2jeARezhFCZcSo6AVGf1pTxLAugEoyXWfX7fcug38uQ2VqodFmS8WBVVSA3WixfaeWSdKuGBZqzXu8cG1YySNsYJCKLCRGtBN13wNpJoZYsxu3nav2qF2jMA9Re1g2LZwspkUJWKKd38NdXoqibxhRisFoXW9e8Xf2EW9MtqZGJKNTrjhgGm5Yn7u3AF1a75abYR1TX9yWcNqAjpQAr",
        "assets": [
          {
            "tokenId": "383d70ab083cc23336a46370fe730b2c51db0e831586b6d545202cbc33938ee1",
            "index": 0,
            "amount": 1,
            "name": "Ergo-RWT-V.beta",
            "decimals": 0,
            "type": "EIP-004"
          },
          {
            "tokenId": "10278c102bf890fdab8ef5111e94053c90b3541bc25b0de2ee8aa6305ccec3de",
            "index": 1,
            "amount": 600,
            "name": "RSN-V.beta",
            "decimals": 0,
            "type": "EIP-004"
          }
        ],
        "additionalRegisters": {
          "R4": {
            "serializedValue": "1a0120846f72637b75f4817eb3f6e8542cb2d92875cf1ddce0fd5b734fc7c9bb48ac60",
            "sigmaType": "Coll[Coll[SByte]]",
            "renderedValue": "[846f72637b75f4817eb3f6e8542cb2d92875cf1ddce0fd5b734fc7c9bb48ac60]"
          }
        },
        "spentTransactionId": null,
        "mainChain": true
      },
      {
        "boxId": "15c805b8829ebe44f6197a116e2f9f2eb50a6b3ffcfa530c21eb55147a4daf12",
        "transactionId": "03f02e4d72f1c4c13b9c3de1b96ecca992c0c4b1a2b33ac5b23be72e2f7909e2",
        "blockId": "5f4961ebf5451b0d85e335ab6390c108b993243d08b8728afb4e771f3e6aec79",
        "value": 300000,
        "index": 1,
        "globalIndex": 26779510,
        "creationHeight": 945129,
        "settlementHeight": 945134,
        "ergoTree": "10130400040004040400040204000e203ac8a90d0aa8c5c50e99dd2588a990fd37b5d3aee70e32d56241f41ed49e9f030404040004000400010104020400040004000e2026083658fce2ae5b9848ad00b7d72878ca84394a47294460d11c43fa1bae738d05020101d807d601b2a5730000d6028cb2db6308a773010001d603aeb5b4a57302b1a5d901036391b1db630872037303d9010363aedb63087203d901054d0e938c7205017202d604e4c6a7041ad605b2a5730400d606db63087205d607ae7206d901074d0e938c720701720295938cb2db63087201730500017306d196830301ef7203938cb2db6308b2a473070073080001b2720473090095720796830201938cb27206730a0001720293c27205c2a7730bd801d608c2a7d196830501ef720393c27201720893e4c67201041a7204938cb2db6308b2a4730c00730d0001b27204730e00957207d801d609b27206730f0096830701938c720901720293cbc272057310e6c67205051ae6c67205060e93e4c67205070ecb720893e4c67205041a7204938c72090273117312",
        "address": "EE7687i4URb4YuSGSQXPCb7UQgHfhJPtKCU7fZmQpof644wX74ZGWnGcLbxxWnLKb8cQnFxkZF1WWeTgmfjEhuAoF2QaMRXg3qdtFZEoKEzfRrMh8Nb7u5GWjEbN1yjQ86PF73Zoo2PeFGotN628Dbm3bPnZhysUcz8pTrQc6BoW32mD9w5jhZRdA7YdP4mzgvsnC7oVWATNA5hgqiKskJxSgvcE63xuG4HdPZb4qakyKRgppndQmDtXNTs7NMBTSFH6Vd9Yqp4TE4MAHMzpWP8iJDSamXS4ppXXeb9sRT5iAS9c2H4atBAkYQ8ntni8C5Wyaz3poq9AaoCxPc1e2jeARezhFCZcSo6AVGf1pTxLAugEoyXWfX7fcug38uQ2VqodFmS8WBVVSA3WixfaeWSdKuGBZqzXu8cG1YySNsYJCKLCRGtBN13wNpJoZYsxu3nav2qF2jMA9Re1g2LZwspkUJWKKd38NdXoqibxhRisFoXW9e8Xf2EW9MtqZGJKNTrjhgGm5Yn7u3AF1a75abYR1TX9yWcNqAjpQAr",
        "assets": [
          {
            "tokenId": "383d70ab083cc23336a46370fe730b2c51db0e831586b6d545202cbc33938ee1",
            "index": 0,
            "amount": 1,
            "name": "Ergo-RWT-V.beta",
            "decimals": 0,
            "type": "EIP-004"
          },
          {
            "tokenId": "10278c102bf890fdab8ef5111e94053c90b3541bc25b0de2ee8aa6305ccec3de",
            "index": 1,
            "amount": 600,
            "name": "RSN-V.beta",
            "decimals": 0,
            "type": "EIP-004"
          }
        ],
        "additionalRegisters": {
          "R4": {
            "serializedValue": "1a0120c1f5aa4b1a713396a63f556df49c70add93b3471cbca893c6146fce5a4b95e76",
            "sigmaType": "Coll[Coll[SByte]]",
            "renderedValue": "[c1f5aa4b1a713396a63f556df49c70add93b3471cbca893c6146fce5a4b95e76]"
          }
        },
        "spentTransactionId": null,
        "mainChain": true
      }
    ]
  }`;

  static convertedNodeTransaction = `{
    "id": "03f02e4d72f1c4c13b9c3de1b96ecca992c0c4b1a2b33ac5b23be72e2f7909e2",
    "blockId": "5f4961ebf5451b0d85e335ab6390c108b993243d08b8728afb4e771f3e6aec79",
    "inclusionHeight": 945134,
    "timestamp": 1676981593346,
    "index": 47,
    "globalIndex": 4795275,
    "numConfirmations": 1449,
    "inputs": [
      {
        "boxId": "e40c4ab3827bd22414c2c11958dcfac6ca7615fdf26a31aff24d4909151572d1",
        "value": 11000000,
        "index": 0,
        "spendingProof": null,
        "outputBlockId": "fa1964deed9cd135fea5557e242ffcb5195f8f7c04be254d79410568900554eb",
        "outputTransactionId": "4924c212ec7a28d01f7b1cb9c0247e584fb39907642749e1f225cadf799b47ec",
        "outputIndex": 0,
        "outputGlobalIndex": 26777230,
        "outputCreatedAt": 945108,
        "outputSettledAt": 945111,
        "ergoTree": "1008040004000e20b7f09c1b0a974d6699a9593a286808ad12748fa8025ab9adcb24375e0395f815040204000e2037080ea7925c407965f27013fe66d2e7d692e68dc0de9219effe4819cea8c7b304c0700e206a1a0cf61ec4148916281e6d82a1d17a60eed7845200401d5231377f4643ba67d805d601e4c6a7041ad602b17201d603b4a573007202d604c2b2a5730100d605cb7204d196830301937202b17203afdc0c1d7201017203d901063c0e63d801d6088c720602ed9383010e8c720601e4c67208041a93c27208720495937205730296830201938cb2db6308b2a47303007304000173059299a373068cc7a70196830201aea4d901066393cbc272067307937205e4c6a7060e",
        "address": "21oSXpSmAC6qp2H72o1YW4D9Dxq3mSkee28gWAFqqd9NRTx15VHM6RwVxScoDnN4jiTegJvto6yK4rZDV788EKrJdoftYXVdQDaeakfgJJhLSfpJcadGZLLwJQkpoRJpesAgY8QfkuyLTkVNbNNshvsA4x3kfvPFDGDQfn8AdN6hJ1FnibRdcj3uY9NQTjjLWNGb1XNdUQyGv73qBJobfaRm9GyXzk9wUq54VhKdcxzTjzuJTtCCv2cxBXKup4EzEEXDNWLcfsD8bNknob5bmUDuTGszsPZHcwAwXgcqsxKvcki7KUs7d666iyu5fNgvFTx8B3D1ageWpAD5RcBbmfiGNEL9k7BnwWiP2pU5DwhJzWH3iU",
        "assets": [
          {
            "tokenId": "383d70ab083cc23336a46370fe730b2c51db0e831586b6d545202cbc33938ee1",
            "index": 0,
            "amount": 10,
            "name": "Ergo-RWT-V.beta",
            "decimals": 0,
            "type": "EIP-004"
          }
        ],
        "additionalRegisters": {
          "R4": "1a0a20846f72637b75f4817eb3f6e8542cb2d92875cf1ddce0fd5b734fc7c9bb48ac6020c1f5aa4b1a713396a63f556df49c70add93b3471cbca893c6146fce5a4b95e7620101f5f0995d90c80a9491815571ed1c9fc5522922fa3bbccbd575d1aa7255f9020e39047fa7025f5eb94f0b1a9d6d4728b5a4270ea1155e4e5b0e265db46589d5c20d206d6f37bc63fae26fbb591d5d4b60181db35fb712ae6dfa2c5faf0078d66eb20e09921d0a87bb63e94aa6074c090a903a280ebd8cfba862396e56668f7138fe120da06f26f55cca0ad06880e0e8fe40d4011373e526f6aafe47caba8f5fa16970720ed6b8b63d187198f3ba55468231b5c83c050f7273364211fcf3b1ca7526ff30220730488119f223822c77c9c89fa73e1794116dd1503fcabf3fc9217ffe7b7b50820d4e03eda58a338f8f65b40de258407dbdbbd9b8ccca374f66be8d97e52c8a752",
          "R5": "1a0c4030323536376662343336376531353162343438363233613235353463383438323039646466343262363737303865663832333537363262363065653130333465046572676f0763617264616e6f3339685a785633594e536662437153364745736573374468415653617476616f4e746473694e766b696d504747326338667a6b4767616464723171797267727068647379376c746132726165327075386870356d7732666e7076753873653030727861367a7a6d63347368346779666b646870776671386c6e68356c39353636336430396e337339637275746e63397977616d637671733565356d360800000000275667ae08000000000bebc2000800000000000f4240036572672c617373657431703430723065756e32616c737a6c78686a376b3475796c796134636a35346c786b6a6a6d736d40333639623131313465353161653662393439663230666432383332393762363463396366313133316161636630306530393939356138306630613036373333660800000000000e6bc7",
          "R6": "0e20ed7f723921f2efd4ec2fbc6a1262376e346c130e6aff4daf63addfe996f2d71c"
        }
      },
      {
        "boxId": "0d491319f26fc576f495b3116b6ed0f3144a8a2b63ffb61f64cc0e20375cbe0f",
        "value": 1000000,
        "index": 1,
        "spendingProof": "f5fd95c0f554c3f11c2afca140c981066270f3a1568c0f4b29c5d8b93c8d9d0c26d5f0b73e4a96dafa45e48acda7c70f71b4bb47ae9ed3d0f05a906c7d72fa9b70096b35a96fec3a784806a0e55170d5b72210f1fe6fd42efe6f0e8cf0c89b7b3e4cd40e9a5237b90ffc1642a9423cf61ab78e481fa1fd63ed09b92f425e4308e297d6609a7314adb86405ef29286076e7dfbe3a2bbcd1bad77165de3becb4471ecb8577637720d1cb9a32855cac2119fff807ff491f6c4c53788c4bd8051a94c614c997b583ccc5e389234389f01e76351c9363624fe58dbb6d4d110d85145ec13ce837bb6ccdf28c5d99de70c09651e3ec0d5db44fd2bb9b2c89567f8b1305645271f04cf34910d1d02a97b19774ddcde4db053c9b2ff551bfd7abf91c875505ae6c23331981956e84a066786ab6fe17b56781afdc0eb27504d155197de75e03aa9382cb14da8b3e3a7947948b03267c4ed5b0e0d42f6b1c84a2b7588cc1b571ccfac947c5d72f123c120c7988f8496166be1ae4e12a64eb2468420f8ec7d6282debf4df5f49c0e98ef870a115a908e60778ff84d2b6337dd1b40b554e181f",
        "outputBlockId": "b44671b510889f17d21c697541cc43812e851d7c26534ddc1f814b364ab79c29",
        "outputTransactionId": "07243a591ed8963ef7613eb94e893bd49d60c25b493b20d7017865b82d80ea2c",
        "outputIndex": 0,
        "outputGlobalIndex": 26778177,
        "outputCreatedAt": 945124,
        "outputSettledAt": 945126,
        "ergoTree": "100304000e20a96b8049f0741c7255b60cf01954439d2e4b2d19ae7d8ebc688ecb190a33b5380400d801d601b2db6501fe730000ea02d1aedb63087201d901024d0e938c720201730198b2e4c672010510730200ade4c67201041ad901020ecdee7202",
        "address": "nB3L2PD3LG4ydEj62n9aymRyPCEbkBdzaubgvCWDH2oxHxFBfAUy9GhWDvteDbbUh5qhXxnW8R46qmEiZfkej8gt4kZYvbeobZJADMrWXwFJTsZ17euEcoAp3KDk31Q26okFpgK9SKdi4",
        "assets": [
          {
            "tokenId": "fc6c2070eb004fc08fcde1514dee56b1d0587477748d8af647179b098f52f559",
            "index": 0,
            "amount": 4797929,
            "name": "RsADA",
            "decimals": 0,
            "type": "EIP-004"
          }
        ],
        "additionalRegisters": {
          "R4": "1a050763617264616e6f67616464723171797267727068647379376c746132726165327075386870356d7732666e7076753873653030727861367a7a6d63347368346779666b646870776671386c6e68356c39353636336430396e337339637275746e63397977616d637671733565356d360634303030303007323030303030303339685a785633594e536662437153364745736573374468415653617476616f4e746473694e766b696d504747326338667a6b47"
        }
      }
    ],
    "dataInputs": [
      {
        "boxId": "350bff7491aa9bf828a922fd8f50df0191c6ae586cb077d84b9caef5dd96cfbc",
        "value": 1100000,
        "index": 0,
        "outputBlockId": "a7aeaa064590253e9f07e63a64d86b5d08c9508f9da13ccac29723e98eb7a0d6",
        "outputTransactionId": "e3f3794c3bfe63a88a2703a2588bce143bdc40fbd06bbdb469bbfaf00cf4eb35",
        "outputIndex": 0,
        "ergoTree": "100504000400040004000402d802d601c2a7d602b2a5730000ea02d196830301937201c2b2a473010093c272027201938cb2db63087202730200018cb2db6308a77303000198b2e4c6a70510730400ade4c6a7041ad901030ecdee7203",
        "address": "MZ4DGXjbMTDYv4wnEPCSzRGp3infV4oBqQvJhnnePTb61wYrGaS2oiNAbesgJphKS3v5tA3cqaEXUdgRP5EsKBihXwSSogs4RNVhhsYyQiYHoWNo3jB7Fm2DDQSVLJZCf41sd",
        "assets": [],
        "additionalRegisters": {
          "R4": "1a0a2102db3849f655693c28e3c44ededd546c6c3267b6f90c0f9ad9785061c387ca2e69210249e1b4b331b93481cc812c024f1f8a198fe078895ad7f03ab890bd4e81fb590721020e106e606e70e426a19900f42f3210420f53498c9956106d30b1837596dbc4512102ddd718f3080a04c2e9f2016dc13153f65d64da83ccfea433139c89236476e2b72102e2c106d43c57936310f06d4fea9f6940dbf1c4e32cb99bdd7ac7b7714e54527121032bb38046b67ed49aa6f4d255bbe1c098ff2f7b682f9922a2a376862de266b16e2103c3374d06b092583835a3a93c7acbc6c449656881abff5d6b17df456a7f3d618b2102956d0fd87b81ebe8ea4763a64e126a548adef2eec3a9719683944100cb992bc52102b980e0cbb817f80163485aea9ce59c3d6249d510733002a9fc6843718a540b072103d7e6475ef5ceb9b0e9b0cad722c9cbfa3a13e8e94188ac963e11e4e66e9eaa2c",
          "R5": "10020e10"
        }
      }
    ],
    "outputs": [
      {
        "boxId": "2ccb2f54cd2b48a3f929f4499b1abdb18c161d768b847eabcf9beb103a08a009",
        "transactionId": "03f02e4d72f1c4c13b9c3de1b96ecca992c0c4b1a2b33ac5b23be72e2f7909e2",
        "blockId": "5f4961ebf5451b0d85e335ab6390c108b993243d08b8728afb4e771f3e6aec79",
        "value": 300000,
        "index": 0,
        "globalIndex": 26779509,
        "creationHeight": 945129,
        "settlementHeight": 945134,
        "ergoTree": "10130400040004040400040204000e203ac8a90d0aa8c5c50e99dd2588a990fd37b5d3aee70e32d56241f41ed49e9f030404040004000400010104020400040004000e2026083658fce2ae5b9848ad00b7d72878ca84394a47294460d11c43fa1bae738d05020101d807d601b2a5730000d6028cb2db6308a773010001d603aeb5b4a57302b1a5d901036391b1db630872037303d9010363aedb63087203d901054d0e938c7205017202d604e4c6a7041ad605b2a5730400d606db63087205d607ae7206d901074d0e938c720701720295938cb2db63087201730500017306d196830301ef7203938cb2db6308b2a473070073080001b2720473090095720796830201938cb27206730a0001720293c27205c2a7730bd801d608c2a7d196830501ef720393c27201720893e4c67201041a7204938cb2db6308b2a4730c00730d0001b27204730e00957207d801d609b27206730f0096830701938c720901720293cbc272057310e6c67205051ae6c67205060e93e4c67205070ecb720893e4c67205041a7204938c72090273117312",
        "address": "EE7687i4URb4YuSGSQXPCb7UQgHfhJPtKCU7fZmQpof644wX74ZGWnGcLbxxWnLKb8cQnFxkZF1WWeTgmfjEhuAoF2QaMRXg3qdtFZEoKEzfRrMh8Nb7u5GWjEbN1yjQ86PF73Zoo2PeFGotN628Dbm3bPnZhysUcz8pTrQc6BoW32mD9w5jhZRdA7YdP4mzgvsnC7oVWATNA5hgqiKskJxSgvcE63xuG4HdPZb4qakyKRgppndQmDtXNTs7NMBTSFH6Vd9Yqp4TE4MAHMzpWP8iJDSamXS4ppXXeb9sRT5iAS9c2H4atBAkYQ8ntni8C5Wyaz3poq9AaoCxPc1e2jeARezhFCZcSo6AVGf1pTxLAugEoyXWfX7fcug38uQ2VqodFmS8WBVVSA3WixfaeWSdKuGBZqzXu8cG1YySNsYJCKLCRGtBN13wNpJoZYsxu3nav2qF2jMA9Re1g2LZwspkUJWKKd38NdXoqibxhRisFoXW9e8Xf2EW9MtqZGJKNTrjhgGm5Yn7u3AF1a75abYR1TX9yWcNqAjpQAr",
        "assets": [
          {
            "tokenId": "383d70ab083cc23336a46370fe730b2c51db0e831586b6d545202cbc33938ee1",
            "index": 0,
            "amount": 1,
            "name": "Ergo-RWT-V.beta",
            "decimals": 0,
            "type": "EIP-004"
          },
          {
            "tokenId": "10278c102bf890fdab8ef5111e94053c90b3541bc25b0de2ee8aa6305ccec3de",
            "index": 1,
            "amount": 600,
            "name": "RSN-V.beta",
            "decimals": 0,
            "type": "EIP-004"
          }
        ],
        "additionalRegisters": {
          "R4": "1a0120846f72637b75f4817eb3f6e8542cb2d92875cf1ddce0fd5b734fc7c9bb48ac60"
        },
        "spentTransactionId": null,
        "mainChain": true
      },
      {
        "boxId": "15c805b8829ebe44f6197a116e2f9f2eb50a6b3ffcfa530c21eb55147a4daf12",
        "transactionId": "03f02e4d72f1c4c13b9c3de1b96ecca992c0c4b1a2b33ac5b23be72e2f7909e2",
        "blockId": "5f4961ebf5451b0d85e335ab6390c108b993243d08b8728afb4e771f3e6aec79",
        "value": 300000,
        "index": 1,
        "globalIndex": 26779510,
        "creationHeight": 945129,
        "settlementHeight": 945134,
        "ergoTree": "10130400040004040400040204000e203ac8a90d0aa8c5c50e99dd2588a990fd37b5d3aee70e32d56241f41ed49e9f030404040004000400010104020400040004000e2026083658fce2ae5b9848ad00b7d72878ca84394a47294460d11c43fa1bae738d05020101d807d601b2a5730000d6028cb2db6308a773010001d603aeb5b4a57302b1a5d901036391b1db630872037303d9010363aedb63087203d901054d0e938c7205017202d604e4c6a7041ad605b2a5730400d606db63087205d607ae7206d901074d0e938c720701720295938cb2db63087201730500017306d196830301ef7203938cb2db6308b2a473070073080001b2720473090095720796830201938cb27206730a0001720293c27205c2a7730bd801d608c2a7d196830501ef720393c27201720893e4c67201041a7204938cb2db6308b2a4730c00730d0001b27204730e00957207d801d609b27206730f0096830701938c720901720293cbc272057310e6c67205051ae6c67205060e93e4c67205070ecb720893e4c67205041a7204938c72090273117312",
        "address": "EE7687i4URb4YuSGSQXPCb7UQgHfhJPtKCU7fZmQpof644wX74ZGWnGcLbxxWnLKb8cQnFxkZF1WWeTgmfjEhuAoF2QaMRXg3qdtFZEoKEzfRrMh8Nb7u5GWjEbN1yjQ86PF73Zoo2PeFGotN628Dbm3bPnZhysUcz8pTrQc6BoW32mD9w5jhZRdA7YdP4mzgvsnC7oVWATNA5hgqiKskJxSgvcE63xuG4HdPZb4qakyKRgppndQmDtXNTs7NMBTSFH6Vd9Yqp4TE4MAHMzpWP8iJDSamXS4ppXXeb9sRT5iAS9c2H4atBAkYQ8ntni8C5Wyaz3poq9AaoCxPc1e2jeARezhFCZcSo6AVGf1pTxLAugEoyXWfX7fcug38uQ2VqodFmS8WBVVSA3WixfaeWSdKuGBZqzXu8cG1YySNsYJCKLCRGtBN13wNpJoZYsxu3nav2qF2jMA9Re1g2LZwspkUJWKKd38NdXoqibxhRisFoXW9e8Xf2EW9MtqZGJKNTrjhgGm5Yn7u3AF1a75abYR1TX9yWcNqAjpQAr",
        "assets": [
          {
            "tokenId": "383d70ab083cc23336a46370fe730b2c51db0e831586b6d545202cbc33938ee1",
            "index": 0,
            "amount": 1,
            "name": "Ergo-RWT-V.beta",
            "decimals": 0,
            "type": "EIP-004"
          },
          {
            "tokenId": "10278c102bf890fdab8ef5111e94053c90b3541bc25b0de2ee8aa6305ccec3de",
            "index": 1,
            "amount": 600,
            "name": "RSN-V.beta",
            "decimals": 0,
            "type": "EIP-004"
          }
        ],
        "additionalRegisters": {
          "R4": "1a0120c1f5aa4b1a713396a63f556df49c70add93b3471cbca893c6146fce5a4b95e76"
        },
        "spentTransactionId": null,
        "mainChain": true
      }
    ]
  }`;
}

export default TestData;
