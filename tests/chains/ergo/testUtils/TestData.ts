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
                "value": 500000003,
                "ergoTree": "${bridgeFeeErgoTree}",
                "assets": [],
                "additionalRegisters": {},
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
                "value": 500000003,
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
                "value": 1000000000,
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
                "value": 1000000000,
                "ergoTree": "${bridgeFeeErgoTree}",
                "assets": [
                    {
                        "tokenId": "db6df45d3ed738ff4ff48d3cdf50ba0e5c3018bc088430a33e700073d2390ba4",
                        "amount": 283001
                    }
                ],
                "additionalRegisters": {},
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
}

export default TestData;
