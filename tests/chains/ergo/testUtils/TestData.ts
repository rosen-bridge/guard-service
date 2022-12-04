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
        "value": 1500000,
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
              "serializedValue": "1a040763617264616e6f0a746f4164647265737334063130303030300432353030",
              "sigmaType": "Coll[Coll[SByte]]",
              "renderedValue": "[414441,746f4164647265737334,313030303030,32353030]"
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
              "serializedValue": "1a040763617264616e6f0a746f4164647265737334063130303030300432353030",
              "sigmaType": "Coll[Coll[SByte]]",
              "renderedValue": "[414441,746f4164647265737334,313030303030,32353030]"
            },
            "R5": {
              "serializedValue": "1a040000000b66726f6d41646472657373"
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
}

export default TestData;
