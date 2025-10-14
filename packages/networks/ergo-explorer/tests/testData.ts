export const testAddress =
  '9iMjQx8PzwBKXRvsFUJFJAPoy31znfEeBUGz8DRkcnJX4rJYjVd';

export const testBlockId =
  'fb8ed75a68538c78e6a1e99bf2a13430c58c25bba9ed688381315822372a83a9';

export const testHeight = 900_000n;

export const testTransaction = {
  id: '7b0c2701042c97b9686bcaf89a0b98aa68b1700113aac014d61c20a87464bbeb',
  blockId: '8a550e86a83fc23447ad32a5b5e7528f835d61c0fcb352e29ee8b256db9add2d',
  inclusionHeight: 994948n,
  timestamp: 1683022023452n,
  index: 1n,
  globalIndex: 5133696n,
  numConfirmations: 840n,
  inputs: [
    {
      boxId: '389f1b1774840f03b02754fad07d596da9c9407bb92b93e0c2f5ea213a6bfb5b',
      value: 5339100000n,
      index: 0n,
      spendingProof:
        'd08d61ba93ffc85e0c494bf76689c683705e8862184b81ccf985c7accbad1b03b6e6961f33caa9c209bd524eda863b82fc4e50c943d27afc',
      outputBlockId:
        '7dde8a0d9a6a69e475b89d884376552a00d03631b956d09e15d141699adc2639',
      outputTransactionId:
        '44023049cd304c587fbdaec968051520e4dca8af2b19ff47cc9dedb2a96b508b',
      outputIndex: 7n,
      outputGlobalIndex: 28769806n,
      outputCreatedAt: 994933n,
      outputSettledAt: 994935n,
      ergoTree:
        '0008cd02b9d478c1900bc041580afdfa4508f0f712da8b9cd3a4dd2d4ee781145ba2e1d3',
      address: '9fvuHu172PmRVg1yFdkhYvax1FB8RYidkSQHBEv5rx84Mhn9Ftu',
      assets: [],
      additionalRegisters: {},
    },
  ],
  dataInputs: [],
  outputs: [
    {
      boxId: 'f8e5176c67506bf1fa92a82f6dd5e40ec141d17e74397e76313109da81688440',
      transactionId:
        '7b0c2701042c97b9686bcaf89a0b98aa68b1700113aac014d61c20a87464bbeb',
      blockId:
        '8a550e86a83fc23447ad32a5b5e7528f835d61c0fcb352e29ee8b256db9add2d',
      value: 5329100000n,
      index: 0n,
      globalIndex: 28770253n,
      creationHeight: 994946n,
      settlementHeight: 994948n,
      ergoTree:
        '0008cd027304abbaebe8bb3a9e963dfa9fa4964d7d001e6a1bd225eadc84048ae49b627c',
      address: '9fPiW45mZwoTxSwTLLXaZcdekqi72emebENmScyTGsjryzrntUe',
      assets: [],
      additionalRegisters: {},
      spentTransactionId:
        '86e0aa90cd9808efe1ae20b7d29b068c6f70969ec0906112603d42d29f020aa0',
      mainChain: true,
    },
    {
      boxId: 'e4093bbe56cd8ca20cc63fdc721ac6149423cdbdd85de9ba0b32950a9b3323b8',
      transactionId:
        '7b0c2701042c97b9686bcaf89a0b98aa68b1700113aac014d61c20a87464bbeb',
      blockId:
        '8a550e86a83fc23447ad32a5b5e7528f835d61c0fcb352e29ee8b256db9add2d',
      value: 10000000n,
      index: 1n,
      globalIndex: 28770254n,
      creationHeight: 994946n,
      settlementHeight: 994948n,
      ergoTree:
        '1005040004000e36100204a00b08cd0279be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798ea02d192a39a8cc7a701730073011001020402d19683030193a38cc7b2a57300000193c2b2a57301007473027303830108cdeeac93b1a57304',
      address:
        '2iHkR7CWvD1R4j1yZg5bkeDRQavjAaVPeTDFGGLZduHyfWMuYpmhHocX8GJoaieTx78FntzJbCBVL6rf96ocJoZdmWBL2fci7NqWgAirppPQmZ7fN9V6z13Ay6brPriBKYqLp1bT2Fk4FkFLCfdPpe',
      assets: [],
      additionalRegisters: {},
      spentTransactionId:
        '59cde651b2ff8a84d0ef4e461251870755c7ad63ca64a87ddf9864dfc2d82973',
      mainChain: true,
    },
  ],
  size: 254n,
};
export const testTransactionWithNullSpendingProof = {
  ...testTransaction,
  inputs: [
    ...testTransaction.inputs.map((input) => ({
      ...input,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      spendingProof: null as any,
    })),
  ],
};
/**
 * Bytes for previous transactions
 */
export const testTransactionBytes =
  '01389f1b1774840f03b02754fad07d596da9c9407bb92b93e0c2f5ea213a6bfb5b38d08d61ba93ffc85e0c494bf76689c683705e8862184b81ccf985c7accbad1b03b6e6961f33caa9c209bd524eda863b82fc4e50c943d27afc00000002e0b98eed130008cd027304abbaebe8bb3a9e963dfa9fa4964d7d001e6a1bd225eadc84048ae49b627c82dd3c000080ade2041005040004000e36100204a00b08cd0279be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798ea02d192a39a8cc7a701730073011001020402d19683030193a38cc7b2a57300000193c2b2a57301007473027303830108cdeeac93b1a5730482dd3c0000';
export const testTransactionWithNullSpendingProofBytes =
  '01389f1b1774840f03b02754fad07d596da9c9407bb92b93e0c2f5ea213a6bfb5b0000000002e0b98eed130008cd027304abbaebe8bb3a9e963dfa9fa4964d7d001e6a1bd225eadc84048ae49b627c82dd3c000080ade2041005040004000e36100204a00b08cd0279be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798ea02d192a39a8cc7a701730073011001020402d19683030193a38cc7b2a57300000193c2b2a57301007473027303830108cdeeac93b1a5730482dd3c0000';

export const testAddressBalance = {
  nanoErgs: 10_000_000_000n,
  tokens: [
    {
      tokenId:
        'b51021bda2dac73022b749061e0e0dea6ba5be5b231abb3861330e6502667840',
      amount: 10n,
    },
  ],
};
export const testAddressBalanceWithNoTokens = {
  nanoErgs: 10_000_000_000n,
};

export const testPartialTransactions = [
  {
    id: '4ff4f9c43f93eeb6630d742ff76535b969354400462f8c5225934ae70ec5f37e',
  },
  {
    id: '04026bd6af4618b7127519b45f4f766fc0a95b7d3eaea1f10bc64cb7e148b02d',
  },
];

export const testBlockHeader = {
  parentId: '1d1fbbb2a816f6ee331e23f1f4e0df995e10794cddb0e393d0637a12e285abb5',
  height: 998407n,
};

export const testMempoolTransactions = Array(100).fill({
  ...testTransaction,
  inputs: [
    {
      ...testTransaction.inputs[0],
      spendingProof: {
        extension: {},
        proofBytes: null,
      },
    },
  ],
});

export const testAddressBoxes = [
  {
    boxId: '93812a42cc7fa8ddd8b788255f07e3e8b930bbed1e44c87895bd47e1abecd16f',
    transactionId:
      '92c773a1911c9c05f7f621a9dac3a52e3ecc7c9da7d8e101fba39983c3bc6021',
    blockId: '33625685bf3e74049ee745ea05d7459917126f986ebdb96414d0d3553eaec1cb',
    value: 300000n,
    index: 11n,
    globalIndex: 28571026n,
    creationHeight: 989988n,
    settlementHeight: 989991n,
    ergoTree:
      '0008cd03f999da8e6e42660e4464d17d29e63bc006734a6710a24eb489b466323d3a9339',
    address: '9iMjQx8PzwBKXRvsFUJFJAPoy31znfEeBUGz8DRkcnJX4rJYjVd',
    assets: [
      {
        tokenId:
          'b37bfa41c2d9e61b4e478ddfc459a03d25b658a2305ffb428fbc47ad6abbeeaa',
        index: 0n,
        amount: 834825000n,
        name: 'RstHoskyVTest2',
        decimals: 0n,
        type: 'EIP-004',
      },
    ],
    additionalRegisters: {},
    spentTransactionId: null,
    mainChain: true,
  },
  {
    boxId: '3a9fdeaed92cf09b12db6de5f347be526b4e27036807d8ee7b3d5a45558c36a0',
    transactionId:
      'c2e9fb8fbc6feb7ad99b8833cdcb5dd05a7d4280c369a81348da56f26f4afea5',
    blockId: '2cd5e04b826fa4b056fa8f75e2a39aa1296918ca510659713eb06a2dd65b8b1b',
    value: 2282206360n,
    index: 1n,
    globalIndex: 28570014,
    creationHeight: 989947n,
    settlementHeight: 989949n,
    ergoTree:
      '0008cd03f999da8e6e42660e4464d17d29e63bc006734a6710a24eb489b466323d3a9339',
    address: '9iMjQx8PzwBKXRvsFUJFJAPoy31znfEeBUGz8DRkcnJX4rJYjVd',
    assets: [
      {
        tokenId:
          '4ed6449240d166b0e44c529b5bf06d210796473d3811b9aa0e15329599164c24',
        index: 0n,
        amount: 44999999980999999n,
        name: 'RST-ADA.V-test',
        decimals: 0n,
        type: 'EIP-004',
      },
      {
        tokenId:
          'a1143e81c5ab485a807e6f0f76af1dd70cc5359b29e0b1229d0edfe490d33b67',
        index: 1n,
        amount: 4831963150n,
        name: 'Ergo-Token.V-test',
        decimals: 0n,
        type: 'EIP-004',
      },
      {
        tokenId:
          'c59e86ef9d0280de582d6266add18fca339a77dfb321268e83033fe47101dc4d',
        index: 2n,
        amount: 499999081615899n,
        name: 'RST-Cardano-Token.V-test',
        decimals: 0n,
        type: 'EIP-004',
      },
      {
        tokenId:
          '51c1745883a62db6cf47f5765bd695317a01e54bcaaaeaa4aab0b517d2f46a24',
        index: 3n,
        amount: 99999999979881465n,
        name: 'RSN.V-test',
        decimals: 0n,
        type: 'EIP-004',
      },
    ],
    additionalRegisters: {},
    spentTransactionId: null,
    mainChain: true,
  },
  {
    boxId: 'e8a88c9996e87fc56bddeadbab5c14208a2870876990ec82a4f1102d139d0743',
    transactionId:
      '1dabc2768e8bd12df5105e8d66923b2ac7706a6243c5494766dfc8b86c8fec6a',
    blockId: '1b072ca028ac06d780f835b8f5133eba888baa995eca5a0e59a87b54ef18b263',
    value: 300000n,
    index: 11n,
    globalIndex: 28553556,
    creationHeight: 989480n,
    settlementHeight: 989484n,
    ergoTree:
      '0008cd03f999da8e6e42660e4464d17d29e63bc006734a6710a24eb489b466323d3a9339',
    address: '9iMjQx8PzwBKXRvsFUJFJAPoy31znfEeBUGz8DRkcnJX4rJYjVd',
    assets: [
      {
        tokenId:
          '38cb230f68a28436fb3b73ae4b927626673e4620bc7c94896178567d436e416b',
        index: 0n,
        amount: 1991000n,
        name: 'RstAdaVTest2',
        decimals: 6n,
        type: 'EIP-004',
      },
    ],
    additionalRegisters: {},
    spentTransactionId: null,
    mainChain: true,
  },
  {
    boxId: 'bb6c3731d9b16b2debe0d5be9a5d4d42240f8b30bd7af6492be5336c42e9fec6',
    transactionId:
      '93bad4141786dea1930317ce0419f22ba54d2dd9350b7aba7395007769ae64b7',
    blockId: '074fd725628d56e70b341cf87125022d8a84f09d436fe2eb2ddc728e819ec616',
    value: 9345466817n,
    index: 1n,
    globalIndex: 28552269,
    creationHeight: 989435n,
    settlementHeight: 989437n,
    ergoTree:
      '0008cd03f999da8e6e42660e4464d17d29e63bc006734a6710a24eb489b466323d3a9339',
    address: '9iMjQx8PzwBKXRvsFUJFJAPoy31znfEeBUGz8DRkcnJX4rJYjVd',
    assets: [
      {
        tokenId:
          '12ce98b66db4f53fc56fbc5a3eac05d76b9b11eeec50ef3d67dbc6dd349ef42a',
        index: 0n,
        amount: 1n,
        name: 'Guard-NFT-V.test3',
        decimals: 0n,
        type: 'EIP-004',
      },
      {
        tokenId:
          '246eb5dd39a11d96d2bc7373b3166835fc72998b045d67ea7adce842c4585a62',
        index: 1n,
        amount: 10n,
        name: 'Cardano-Cleanup.V-test2',
        decimals: 0n,
        type: 'EIP-004',
      },
      {
        tokenId:
          'c59e86ef9d0280de582d6266add18fca339a77dfb321268e83033fe47101dc4d',
        index: 2n,
        amount: 499999996990000n,
        name: 'RST-Cardano-Token.V-test',
        decimals: 0n,
        type: 'EIP-004',
      },
      {
        tokenId:
          'a1143e81c5ab485a807e6f0f76af1dd70cc5359b29e0b1229d0edfe490d33b67',
        index: 3n,
        amount: 999959074899599n,
        name: 'Ergo-Token.V-test',
        decimals: 0n,
        type: 'EIP-004',
      },
      {
        tokenId:
          'a599bb94b230f8d3ac94856ab24c31b235ab493d3415097102916c600fbbf969',
        index: 4n,
        amount: 98n,
        name: 'RWT Repo NFT-V.beta2',
        decimals: 0n,
        type: 'EIP-004',
      },
      {
        tokenId:
          '3443950555c6088a4b3fbd99b853a1db89765c9c7be318a6134db2ee0f8ecbca',
        index: 5n,
        amount: 10n,
        name: 'Ergo-Cleanup.V-test2',
        decimals: 0n,
        type: 'EIP-004',
      },
      {
        tokenId:
          '45e873d4e5af0d0fd6905ef51053fa7e9c672cd26b23b8a7f4feb17254f25392',
        index: 6n,
        amount: 196n,
        name: 'Rosen-Minimum-Fee.V-test',
        decimals: 0n,
        type: 'EIP-004',
      },
      {
        tokenId:
          '844e3cf44b3181b4cacbccbf7596d341f41147d73daf4b565ecaac983aba2508',
        index: 7n,
        amount: 9919999998n,
        name: 'RSN.V-test2',
        decimals: 0n,
        type: 'EIP-004',
      },
      {
        tokenId:
          '4b1e5bcfbd6763b9cea8411841213611258fabed16293af6aa8cd8200b7e1286',
        index: 8n,
        amount: 98n,
        name: 'RWT Repo.V-test',
        decimals: 0n,
        type: 'EIP-004',
      },
      {
        tokenId:
          '1ea49e1c052803576e91275b27dffbae3f4ccad9da5219bcda51ea5006fe7661',
        index: 9n,
        amount: 196n,
        name: 'Rosen-Minimum-Fee.V-test2',
        decimals: 0n,
        type: 'EIP-004',
      },
      {
        tokenId:
          '4ed6449240d166b0e44c529b5bf06d210796473d3811b9aa0e15329599164c24',
        index: 10n,
        amount: 2400000n,
        name: 'RST-ADA.V-test',
        decimals: 0n,
        type: 'EIP-004',
      },
      {
        tokenId:
          '65214ca53fbf09c0875d71f67f28a0471a4d6d4f66c38ae47b6a417e645f68fd',
        index: 11n,
        amount: 10n,
        name: 'Ergo-Cleanup.V-test',
        decimals: 0n,
        type: 'EIP-004',
      },
      {
        tokenId:
          'c79e1748e862a80c4f7193077b600f9ffb65c612297f9a8829407044c1eb1066',
        index: 12n,
        amount: 10n,
        name: 'Cardano-Cleanup.V-test',
        decimals: 0n,
        type: 'EIP-004',
      },
      {
        tokenId:
          '51c1745883a62db6cf47f5765bd695317a01e54bcaaaeaa4aab0b517d2f46a24',
        index: 13n,
        amount: 900000000000000000n,
        name: 'RSN.V-test',
        decimals: 0n,
        type: 'EIP-004',
      },
    ],
    additionalRegisters: {},
    spentTransactionId: null,
    mainChain: true,
  },
];
/**
 * Bytes for previous boxes
 */
export const testAddressBoxesBytes = [
  'e0a7120008cd03f999da8e6e42660e4464d17d29e63bc006734a6710a24eb489b466323d3a9339a4b63c01b37bfa41c2d9e61b4e478ddfc459a03d25b658a2305ffb428fbc47ad6abbeeaaa8d6898e030092c773a1911c9c05f7f621a9dac3a52e3ecc7c9da7d8e101fba39983c3bc60210b',
  '98e99ec0080008cd03f999da8e6e42660e4464d17d29e63bc006734a6710a24eb489b466323d3a9339fbb53c044ed6449240d166b0e44c529b5bf06d210796473d3811b9aa0e15329599164c24bfaa8aaeafe8f74fa1143e81c5ab485a807e6f0f76af1dd70cc5359b29e0b1229d0edfe490d33b678ed0878012c59e86ef9d0280de582d6266add18fca339a77dfb321268e83033fe47101dc4d9ba497ddf1d77151c1745883a62db6cf47f5765bd695317a01e54bcaaaeaa4aab0b517d2f46a24f987dce285afd1b10100c2e9fb8fbc6feb7ad99b8833cdcb5dd05a7d4280c369a81348da56f26f4afea501',
  'e0a7120008cd03f999da8e6e42660e4464d17d29e63bc006734a6710a24eb489b466323d3a9339a8b23c0138cb230f68a28436fb3b73ae4b927626673e4620bc7c94896178567d436e416bd8c279001dabc2768e8bd12df5105e8d66923b2ac7706a6243c5494766dfc8b86c8fec6a0b',
  'c183a2e8220008cd03f999da8e6e42660e4464d17d29e63bc006734a6710a24eb489b466323d3a9339fbb13c0e12ce98b66db4f53fc56fbc5a3eac05d76b9b11eeec50ef3d67dbc6dd349ef42a01246eb5dd39a11d96d2bc7373b3166835fc72998b045d67ea7adce842c4585a620ac59e86ef9d0280de582d6266add18fca339a77dfb321268e83033fe47101dc4db0a4d591f5d771a1143e81c5ab485a807e6f0f76af1dd70cc5359b29e0b1229d0edfe490d33b678f8dccebd1aee301a599bb94b230f8d3ac94856ab24c31b235ab493d3415097102916c600fbbf969623443950555c6088a4b3fbd99b853a1db89765c9c7be318a6134db2ee0f8ecbca0a45e873d4e5af0d0fd6905ef51053fa7e9c672cd26b23b8a7f4feb17254f25392c401844e3cf44b3181b4cacbccbf7596d341f41147d73daf4b565ecaac983aba2508fedf9cfa244b1e5bcfbd6763b9cea8411841213611258fabed16293af6aa8cd8200b7e1286621ea49e1c052803576e91275b27dffbae3f4ccad9da5219bcda51ea5006fe7661c4014ed6449240d166b0e44c529b5bf06d210796473d3811b9aa0e15329599164c2480be920165214ca53fbf09c0875d71f67f28a0471a4d6d4f66c38ae47b6a417e645f68fd0ac79e1748e862a80c4f7193077b600f9ffb65c612297f9a8829407044c1eb10660a51c1745883a62db6cf47f5765bd695317a01e54bcaaaeaa4aab0b517d2f46a248080e8ceb4a7dcbe0c0093bad4141786dea1930317ce0419f22ba54d2dd9350b7aba7395007769ae64b701',
];

export const testTokenIdBoxes = [
  {
    boxId: '3a9fdeaed92cf09b12db6de5f347be526b4e27036807d8ee7b3d5a45558c36a0',
    transactionId:
      'c2e9fb8fbc6feb7ad99b8833cdcb5dd05a7d4280c369a81348da56f26f4afea5',
    blockId: '2cd5e04b826fa4b056fa8f75e2a39aa1296918ca510659713eb06a2dd65b8b1b',
    value: 2282206360n,
    index: 1n,
    globalIndex: 28570014n,
    creationHeight: 989947n,
    settlementHeight: 989949n,
    ergoTree:
      '0008cd03f999da8e6e42660e4464d17d29e63bc006734a6710a24eb489b466323d3a9339',
    address: '9iMjQx8PzwBKXRvsFUJFJAPoy31znfEeBUGz8DRkcnJX4rJYjVd',
    assets: [
      {
        tokenId:
          '4ed6449240d166b0e44c529b5bf06d210796473d3811b9aa0e15329599164c24',
        index: 0n,
        amount: 44999999980999999n,
        name: 'RST-ADA.V-test',
        decimals: 0n,
        type: 'EIP-004',
      },
      {
        tokenId:
          'a1143e81c5ab485a807e6f0f76af1dd70cc5359b29e0b1229d0edfe490d33b67',
        index: 1n,
        amount: 4831963150n,
        name: 'Ergo-Token.V-test',
        decimals: 0n,
        type: 'EIP-004',
      },
      {
        tokenId:
          'c59e86ef9d0280de582d6266add18fca339a77dfb321268e83033fe47101dc4d',
        index: 2n,
        amount: 499999081615899n,
        name: 'RST-Cardano-Token.V-test',
        decimals: 0n,
        type: 'EIP-004',
      },
      {
        tokenId:
          '51c1745883a62db6cf47f5765bd695317a01e54bcaaaeaa4aab0b517d2f46a24',
        index: 3n,
        amount: 99999999979881465n,
        name: 'RSN.V-test',
        decimals: 0n,
        type: 'EIP-004',
      },
    ],
    additionalRegisters: {},
    spentTransactionId: null,
    mainChain: true,
  },
  {
    boxId: 'bb6c3731d9b16b2debe0d5be9a5d4d42240f8b30bd7af6492be5336c42e9fec6',
    transactionId:
      '93bad4141786dea1930317ce0419f22ba54d2dd9350b7aba7395007769ae64b7',
    blockId: '074fd725628d56e70b341cf87125022d8a84f09d436fe2eb2ddc728e819ec616',
    value: 9345466817n,
    index: 1n,
    globalIndex: 28552269n,
    creationHeight: 989435n,
    settlementHeight: 989437n,
    ergoTree:
      '0008cd03f999da8e6e42660e4464d17d29e63bc006734a6710a24eb489b466323d3a9339',
    address: '9iMjQx8PzwBKXRvsFUJFJAPoy31znfEeBUGz8DRkcnJX4rJYjVd',
    assets: [
      {
        tokenId:
          '12ce98b66db4f53fc56fbc5a3eac05d76b9b11eeec50ef3d67dbc6dd349ef42a',
        index: 0n,
        amount: 1n,
        name: 'Guard-NFT-V.test3',
        decimals: 0n,
        type: 'EIP-004',
      },
      {
        tokenId:
          '246eb5dd39a11d96d2bc7373b3166835fc72998b045d67ea7adce842c4585a62',
        index: 1n,
        amount: 10n,
        name: 'Cardano-Cleanup.V-test2',
        decimals: 0n,
        type: 'EIP-004',
      },
      {
        tokenId:
          'c59e86ef9d0280de582d6266add18fca339a77dfb321268e83033fe47101dc4d',
        index: 2n,
        amount: 499999996990000n,
        name: 'RST-Cardano-Token.V-test',
        decimals: 0n,
        type: 'EIP-004',
      },
      {
        tokenId:
          'a1143e81c5ab485a807e6f0f76af1dd70cc5359b29e0b1229d0edfe490d33b67',
        index: 3n,
        amount: 999959074899599n,
        name: 'Ergo-Token.V-test',
        decimals: 0n,
        type: 'EIP-004',
      },
      {
        tokenId:
          'a599bb94b230f8d3ac94856ab24c31b235ab493d3415097102916c600fbbf969',
        index: 4n,
        amount: 98n,
        name: 'RWT Repo NFT-V.beta2',
        decimals: 0n,
        type: 'EIP-004',
      },
      {
        tokenId:
          '3443950555c6088a4b3fbd99b853a1db89765c9c7be318a6134db2ee0f8ecbca',
        index: 5n,
        amount: 10n,
        name: 'Ergo-Cleanup.V-test2',
        decimals: 0n,
        type: 'EIP-004',
      },
      {
        tokenId:
          '45e873d4e5af0d0fd6905ef51053fa7e9c672cd26b23b8a7f4feb17254f25392',
        index: 6n,
        amount: 196n,
        name: 'Rosen-Minimum-Fee.V-test',
        decimals: 0n,
        type: 'EIP-004',
      },
      {
        tokenId:
          '844e3cf44b3181b4cacbccbf7596d341f41147d73daf4b565ecaac983aba2508',
        index: 7n,
        amount: 9919999998n,
        name: 'RSN.V-test2',
        decimals: 0n,
        type: 'EIP-004',
      },
      {
        tokenId:
          '4b1e5bcfbd6763b9cea8411841213611258fabed16293af6aa8cd8200b7e1286',
        index: 8n,
        amount: 98n,
        name: 'RWT Repo.V-test',
        decimals: 0n,
        type: 'EIP-004',
      },
      {
        tokenId:
          '1ea49e1c052803576e91275b27dffbae3f4ccad9da5219bcda51ea5006fe7661',
        index: 9n,
        amount: 196n,
        name: 'Rosen-Minimum-Fee.V-test2',
        decimals: 0n,
        type: 'EIP-004',
      },
      {
        tokenId:
          '4ed6449240d166b0e44c529b5bf06d210796473d3811b9aa0e15329599164c24',
        index: 10n,
        amount: 2400000n,
        name: 'RST-ADA.V-test',
        decimals: 0n,
        type: 'EIP-004',
      },
      {
        tokenId:
          '65214ca53fbf09c0875d71f67f28a0471a4d6d4f66c38ae47b6a417e645f68fd',
        index: 11n,
        amount: 10n,
        name: 'Ergo-Cleanup.V-test',
        decimals: 0n,
        type: 'EIP-004',
      },
      {
        tokenId:
          'c79e1748e862a80c4f7193077b600f9ffb65c612297f9a8829407044c1eb1066',
        index: 12n,
        amount: 10n,
        name: 'Cardano-Cleanup.V-test',
        decimals: 0n,
        type: 'EIP-004',
      },
      {
        tokenId:
          '51c1745883a62db6cf47f5765bd695317a01e54bcaaaeaa4aab0b517d2f46a24',
        index: 13n,
        amount: 900000000000000000n,
        name: 'RSN.V-test',
        decimals: 0n,
        type: 'EIP-004',
      },
    ],
    additionalRegisters: {},
    spentTransactionId: null,
    mainChain: true,
  },
  {
    boxId: '495b433f8e2fc0ffba6031d19b9965c4f7d00d6bffad2a1abdd03ffe123c65f1',
    transactionId:
      '601ca61a09746ab59552dcc045bf0d03e0dbda5feb4326689910ecc488a42689',
    blockId: '8f4c84c6eacfa8091760ba22801dd70bd005e8916b8bd6cc9901ae0a355e1567',
    value: 300000n,
    index: 11n,
    globalIndex: 28389330n,
    creationHeight: 984936n,
    settlementHeight: 984940n,
    ergoTree:
      '0008cd03cc76f1074a4477cd378329c4e902ee6145add72e9c26c82b4f2255e768d48811',
    address: '9i1rTxaZpLprUkVHpY4YNyooksLuouiKqZ2v1J5nf8xFTXBCVcB',
    assets: [
      {
        tokenId:
          'a1143e81c5ab485a807e6f0f76af1dd70cc5359b29e0b1229d0edfe490d33b67',
        index: 0n,
        amount: 1200000n,
        name: 'Ergo-Token.V-test',
        decimals: 0n,
        type: 'EIP-004',
      },
    ],
    additionalRegisters: {},
    spentTransactionId: null,
    mainChain: true,
  },
  {
    boxId: '6b8ecccbd3fb0067382285e39c0a148131aa33895a3cb277cdee9b18e2625e92',
    transactionId:
      '89df6648b4ed29389bb58ecc069d09f9330a606b7a6735b4ff83ab370acbdcdd',
    blockId: '0ff8e35ed62a941bbe2bcc8b33d1e7b9160659b4826a11340f178b807fe20ba2',
    value: 300000n,
    index: 11n,
    globalIndex: 28183169n,
    creationHeight: 979964n,
    settlementHeight: 979968n,
    ergoTree:
      '0008cd03cc76f1074a4477cd378329c4e902ee6145add72e9c26c82b4f2255e768d48811',
    address: '9i1rTxaZpLprUkVHpY4YNyooksLuouiKqZ2v1J5nf8xFTXBCVcB',
    assets: [
      {
        tokenId:
          'a1143e81c5ab485a807e6f0f76af1dd70cc5359b29e0b1229d0edfe490d33b67',
        index: 0n,
        amount: 1200000n,
        name: 'Ergo-Token.V-test',
        decimals: 0n,
        type: 'EIP-004',
      },
    ],
    additionalRegisters: {},
    spentTransactionId: null,
    mainChain: true,
  },
  {
    boxId: '6cf9a04773052b15617ec9cc11cd717b95d59827f3bcfdcd77646d1ef7cb0912',
    transactionId:
      '601ca61a09746ab59552dcc045bf0d03e0dbda5feb4326689910ecc488a42689',
    blockId: '8f4c84c6eacfa8091760ba22801dd70bd005e8916b8bd6cc9901ae0a355e1567',
    value: 300000n,
    index: 10n,
    globalIndex: 28389329n,
    creationHeight: 984936n,
    settlementHeight: 984940n,
    ergoTree:
      '0008cd02d0b75bc997751195d143671cc10e8a590f25b987f2b2dd0d99cc5f48c6966d3d',
    address: '9g6ytenZVgR3RXYqXUG3vRcXLhmd12VtUKCuecFqL1P18axCErM',
    assets: [
      {
        tokenId:
          'a1143e81c5ab485a807e6f0f76af1dd70cc5359b29e0b1229d0edfe490d33b67',
        index: 0n,
        amount: 18147347n,
        name: 'Ergo-Token.V-test',
        decimals: 0n,
        type: 'EIP-004',
      },
      {
        tokenId:
          '51c1745883a62db6cf47f5765bd695317a01e54bcaaaeaa4aab0b517d2f46a24',
        index: 1n,
        amount: 131n,
        name: 'RSN.V-test',
        decimals: 0n,
        type: 'EIP-004',
      },
    ],
    additionalRegisters: {
      R4: {
        serializedValue: '1a0100',
        sigmaType: 'Coll[Coll[SByte]]',
        renderedValue: '[]',
      },
    },
    spentTransactionId: null,
    mainChain: true,
  },
  {
    boxId: '2cbab4709e546af864fc6186e3b78fd0d0e3dce734304000124c40d37bad36b0',
    transactionId:
      '89df6648b4ed29389bb58ecc069d09f9330a606b7a6735b4ff83ab370acbdcdd',
    blockId: '0ff8e35ed62a941bbe2bcc8b33d1e7b9160659b4826a11340f178b807fe20ba2',
    value: 300000n,
    index: 10n,
    globalIndex: 28183168n,
    creationHeight: 979964n,
    settlementHeight: 979968n,
    ergoTree:
      '0008cd02d0b75bc997751195d143671cc10e8a590f25b987f2b2dd0d99cc5f48c6966d3d',
    address: '9g6ytenZVgR3RXYqXUG3vRcXLhmd12VtUKCuecFqL1P18axCErM',
    assets: [
      {
        tokenId:
          'a1143e81c5ab485a807e6f0f76af1dd70cc5359b29e0b1229d0edfe490d33b67',
        index: 0n,
        amount: 19581053n,
        name: 'Ergo-Token.V-test',
        decimals: 0n,
        type: 'EIP-004',
      },
      {
        tokenId:
          '51c1745883a62db6cf47f5765bd695317a01e54bcaaaeaa4aab0b517d2f46a24',
        index: 1n,
        amount: 145n,
        name: 'RSN.V-test',
        decimals: 0n,
        type: 'EIP-004',
      },
    ],
    additionalRegisters: {
      R4: {
        serializedValue: '1a0100',
        sigmaType: 'Coll[Coll[SByte]]',
        renderedValue: '[]',
      },
    },
    spentTransactionId: null,
    mainChain: true,
  },
  {
    boxId: '7e683b5f3e0e2a12b122599d60ff6444848882e85b518dd579bf789ab82aa493',
    transactionId:
      '0be0855d4f64f36ed438d6ebdccaa8754baedea2f0e5249932e0d5cc13c1c632',
    blockId: '7d36c5b76dba81bcec05978127523cb2c06922858f88c39239d4ebafb38d3e64',
    value: 300000n,
    index: 11n,
    globalIndex: 28181474n,
    creationHeight: 979912n,
    settlementHeight: 979919n,
    ergoTree:
      '0008cd03cc76f1074a4477cd378329c4e902ee6145add72e9c26c82b4f2255e768d48811',
    address: '9i1rTxaZpLprUkVHpY4YNyooksLuouiKqZ2v1J5nf8xFTXBCVcB',
    assets: [
      {
        tokenId:
          'a1143e81c5ab485a807e6f0f76af1dd70cc5359b29e0b1229d0edfe490d33b67',
        index: 0n,
        amount: 1200000n,
        name: 'Ergo-Token.V-test',
        decimals: 0n,
        type: 'EIP-004',
      },
    ],
    additionalRegisters: {},
    spentTransactionId: null,
    mainChain: true,
  },
  {
    boxId: '0f68b85bd8eca8915f16cf5608c85fdc7ecd7daee53836452203d48e8233c399',
    transactionId:
      '0be0855d4f64f36ed438d6ebdccaa8754baedea2f0e5249932e0d5cc13c1c632',
    blockId: '7d36c5b76dba81bcec05978127523cb2c06922858f88c39239d4ebafb38d3e64',
    value: 300000n,
    index: 10n,
    globalIndex: 28181473n,
    creationHeight: 979912n,
    settlementHeight: 979919n,
    ergoTree:
      '0008cd02d0b75bc997751195d143671cc10e8a590f25b987f2b2dd0d99cc5f48c6966d3d',
    address: '9g6ytenZVgR3RXYqXUG3vRcXLhmd12VtUKCuecFqL1P18axCErM',
    assets: [
      {
        tokenId:
          'a1143e81c5ab485a807e6f0f76af1dd70cc5359b29e0b1229d0edfe490d33b67',
        index: 0n,
        amount: 13114144n,
        name: 'Ergo-Token.V-test',
        decimals: 0n,
        type: 'EIP-004',
      },
      {
        tokenId:
          '51c1745883a62db6cf47f5765bd695317a01e54bcaaaeaa4aab0b517d2f46a24',
        index: 1n,
        amount: 101n,
        name: 'RSN.V-test',
        decimals: 0n,
        type: 'EIP-004',
      },
    ],
    additionalRegisters: {
      R4: {
        serializedValue: '1a0100',
        sigmaType: 'Coll[Coll[SByte]]',
        renderedValue: '[]',
      },
    },
    spentTransactionId: null,
    mainChain: true,
  },
  {
    boxId: '8d9444d3b50791cf98cd3acdfa795b7b0a97d7fd8722e53d1e54cc69a8846d16',
    transactionId:
      '3dd7eaa9aad43085f3b8d6a9c251c415a8498df1145029b501ae6f3b5f216593',
    blockId: '3442a31919816d7718cc603507889467b2a7b1e88e7c9b2852e948ebee47798a',
    value: 300000n,
    index: 11n,
    globalIndex: 28173661n,
    creationHeight: 979632n,
    settlementHeight: 979637n,
    ergoTree:
      '0008cd03cc76f1074a4477cd378329c4e902ee6145add72e9c26c82b4f2255e768d48811',
    address: '9i1rTxaZpLprUkVHpY4YNyooksLuouiKqZ2v1J5nf8xFTXBCVcB',
    assets: [
      {
        tokenId:
          'a1143e81c5ab485a807e6f0f76af1dd70cc5359b29e0b1229d0edfe490d33b67',
        index: 0n,
        amount: 400000n,
        name: 'Ergo-Token.V-test',
        decimals: 0n,
        type: 'EIP-004',
      },
    ],
    additionalRegisters: {},
    spentTransactionId: null,
    mainChain: true,
  },
  {
    boxId: '09e4185c46e3642ff90dc2f57102390824d7b735eb9aad17df3b8b115ebe6382',
    transactionId:
      '3dd7eaa9aad43085f3b8d6a9c251c415a8498df1145029b501ae6f3b5f216593',
    blockId: '3442a31919816d7718cc603507889467b2a7b1e88e7c9b2852e948ebee47798a',
    value: 300000n,
    index: 10n,
    globalIndex: 28173660n,
    creationHeight: 979632n,
    settlementHeight: 979637n,
    ergoTree:
      '0008cd02d0b75bc997751195d143671cc10e8a590f25b987f2b2dd0d99cc5f48c6966d3d',
    address: '9g6ytenZVgR3RXYqXUG3vRcXLhmd12VtUKCuecFqL1P18axCErM',
    assets: [
      {
        tokenId:
          'a1143e81c5ab485a807e6f0f76af1dd70cc5359b29e0b1229d0edfe490d33b67',
        index: 0n,
        amount: 19782881n,
        name: 'Ergo-Token.V-test',
        decimals: 0n,
        type: 'EIP-004',
      },
      {
        tokenId:
          '51c1745883a62db6cf47f5765bd695317a01e54bcaaaeaa4aab0b517d2f46a24',
        index: 1n,
        amount: 147n,
        name: 'RSN.V-test',
        decimals: 0n,
        type: 'EIP-004',
      },
    ],
    additionalRegisters: {
      R4: {
        serializedValue:
          '1a0120ab96b8a289215de944838c64415795091c2008b67960522ac059b5157c15909d',
        sigmaType: 'Coll[Coll[SByte]]',
        renderedValue:
          '[ab96b8a289215de944838c64415795091c2008b67960522ac059b5157c15909d]',
      },
    },
    spentTransactionId: null,
    mainChain: true,
  },
];
/**
 * Bytes for previous boxes
 */
export const testTokenIdBoxesBytes = [
  '98e99ec0080008cd03f999da8e6e42660e4464d17d29e63bc006734a6710a24eb489b466323d3a9339fbb53c044ed6449240d166b0e44c529b5bf06d210796473d3811b9aa0e15329599164c24bfaa8aaeafe8f74fa1143e81c5ab485a807e6f0f76af1dd70cc5359b29e0b1229d0edfe490d33b678ed0878012c59e86ef9d0280de582d6266add18fca339a77dfb321268e83033fe47101dc4d9ba497ddf1d77151c1745883a62db6cf47f5765bd695317a01e54bcaaaeaa4aab0b517d2f46a24f987dce285afd1b10100c2e9fb8fbc6feb7ad99b8833cdcb5dd05a7d4280c369a81348da56f26f4afea501',
  'c183a2e8220008cd03f999da8e6e42660e4464d17d29e63bc006734a6710a24eb489b466323d3a9339fbb13c0e12ce98b66db4f53fc56fbc5a3eac05d76b9b11eeec50ef3d67dbc6dd349ef42a01246eb5dd39a11d96d2bc7373b3166835fc72998b045d67ea7adce842c4585a620ac59e86ef9d0280de582d6266add18fca339a77dfb321268e83033fe47101dc4db0a4d591f5d771a1143e81c5ab485a807e6f0f76af1dd70cc5359b29e0b1229d0edfe490d33b678f8dccebd1aee301a599bb94b230f8d3ac94856ab24c31b235ab493d3415097102916c600fbbf969623443950555c6088a4b3fbd99b853a1db89765c9c7be318a6134db2ee0f8ecbca0a45e873d4e5af0d0fd6905ef51053fa7e9c672cd26b23b8a7f4feb17254f25392c401844e3cf44b3181b4cacbccbf7596d341f41147d73daf4b565ecaac983aba2508fedf9cfa244b1e5bcfbd6763b9cea8411841213611258fabed16293af6aa8cd8200b7e1286621ea49e1c052803576e91275b27dffbae3f4ccad9da5219bcda51ea5006fe7661c4014ed6449240d166b0e44c529b5bf06d210796473d3811b9aa0e15329599164c2480be920165214ca53fbf09c0875d71f67f28a0471a4d6d4f66c38ae47b6a417e645f68fd0ac79e1748e862a80c4f7193077b600f9ffb65c612297f9a8829407044c1eb10660a51c1745883a62db6cf47f5765bd695317a01e54bcaaaeaa4aab0b517d2f46a248080e8ceb4a7dcbe0c0093bad4141786dea1930317ce0419f22ba54d2dd9350b7aba7395007769ae64b701',
  'e0a7120008cd03cc76f1074a4477cd378329c4e902ee6145add72e9c26c82b4f2255e768d48811e88e3c01a1143e81c5ab485a807e6f0f76af1dd70cc5359b29e0b1229d0edfe490d33b67809f4900601ca61a09746ab59552dcc045bf0d03e0dbda5feb4326689910ecc488a426890b',
  'e0a7120008cd03cc76f1074a4477cd378329c4e902ee6145add72e9c26c82b4f2255e768d48811fce73b01a1143e81c5ab485a807e6f0f76af1dd70cc5359b29e0b1229d0edfe490d33b67809f490089df6648b4ed29389bb58ecc069d09f9330a606b7a6735b4ff83ab370acbdcdd0b',
  'e0a7120008cd02d0b75bc997751195d143671cc10e8a590f25b987f2b2dd0d99cc5f48c6966d3de88e3c02a1143e81c5ab485a807e6f0f76af1dd70cc5359b29e0b1229d0edfe490d33b6793d0d30851c1745883a62db6cf47f5765bd695317a01e54bcaaaeaa4aab0b517d2f46a248301011a0100601ca61a09746ab59552dcc045bf0d03e0dbda5feb4326689910ecc488a426890a',
  'e0a7120008cd02d0b75bc997751195d143671cc10e8a590f25b987f2b2dd0d99cc5f48c6966d3dfce73b02a1143e81c5ab485a807e6f0f76af1dd70cc5359b29e0b1229d0edfe490d33b67fd90ab0951c1745883a62db6cf47f5765bd695317a01e54bcaaaeaa4aab0b517d2f46a249101011a010089df6648b4ed29389bb58ecc069d09f9330a606b7a6735b4ff83ab370acbdcdd0a',
  'e0a7120008cd03cc76f1074a4477cd378329c4e902ee6145add72e9c26c82b4f2255e768d48811c8e73b01a1143e81c5ab485a807e6f0f76af1dd70cc5359b29e0b1229d0edfe490d33b67809f49000be0855d4f64f36ed438d6ebdccaa8754baedea2f0e5249932e0d5cc13c1c6320b',
  'e0a7120008cd02d0b75bc997751195d143671cc10e8a590f25b987f2b2dd0d99cc5f48c6966d3dc8e73b02a1143e81c5ab485a807e6f0f76af1dd70cc5359b29e0b1229d0edfe490d33b67a0b6a00651c1745883a62db6cf47f5765bd695317a01e54bcaaaeaa4aab0b517d2f46a2465011a01000be0855d4f64f36ed438d6ebdccaa8754baedea2f0e5249932e0d5cc13c1c6320a',
  'e0a7120008cd03cc76f1074a4477cd378329c4e902ee6145add72e9c26c82b4f2255e768d48811b0e53b01a1143e81c5ab485a807e6f0f76af1dd70cc5359b29e0b1229d0edfe490d33b6780b518003dd7eaa9aad43085f3b8d6a9c251c415a8498df1145029b501ae6f3b5f2165930b',
  'e0a7120008cd02d0b75bc997751195d143671cc10e8a590f25b987f2b2dd0d99cc5f48c6966d3db0e53b02a1143e81c5ab485a807e6f0f76af1dd70cc5359b29e0b1229d0edfe490d33b67e1b9b70951c1745883a62db6cf47f5765bd695317a01e54bcaaaeaa4aab0b517d2f46a249301011a0120ab96b8a289215de944838c64415795091c2008b67960522ac059b5157c15909d3dd7eaa9aad43085f3b8d6a9c251c415a8498df1145029b501ae6f3b5f2165930a',
];

export const testBlockHeaders = [
  {
    id: 'aed35bf19a822c218200618913616e7a50101a40588e1ee45cce89ee55c8403d',
    parentId:
      '22cf8658bfd65d005da052d2dff38caf0f4ebb7a2d252fa74ffc1b3225e2e109',
    version: 3n,
    timestamp: 1683957638377n,
    height: 1002623n,
    nBits: 118154417n,
    votes: '000000',
    stateRoot:
      '5f4dd95b85d3f5a75c7a64f3a312d0046bee88080e0667968ed4d24ba61c7af519',
    adProofsRoot:
      '5b1b7a810271564ce66a411db5df2c5d2af116c601a16915af1d0de5839d26ad',
    transactionsRoot:
      '53b41b7f49c2141a174a7d67962f95e4f8e1e48af673c3974d964797bc4f5139',
    extensionHash:
      'b5ef773dd6a58053af81fa5ce4012d7f372e28dcf5d9172d71d62ccb468b2806',
    powSolutions: {
      pk: '03677d088e4958aedcd5cd65845540e91272eba99e4d98e382f5ae2351e0dfbefd',
      w: '0279be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798',
      n: 'dabf2b005d5d9e5e',
      d: '0',
    },
  },
  {
    id: '22cf8658bfd65d005da052d2dff38caf0f4ebb7a2d252fa74ffc1b3225e2e109',
    parentId:
      '3064f1130b3bb1c78456761e6468d80c2d40cc20ea330430fefe9c375893526c',
    version: 3n,
    timestamp: 1683957471395n,
    height: 1002622n,
    nBits: 118154417n,
    votes: '000000',
    stateRoot:
      '15a08180b39b8c0978a4ee483e9742474e229c6b013eddefacda0dcf4bbe91f019',
    adProofsRoot:
      '3b6df58356f620e381b3e4b288723e3b2398a524e0bf1e6faba66ed01d3bef22',
    transactionsRoot:
      'b2a059b9e4adc3e2ed448033692995fd3e3426a288f192289d82409614522589',
    extensionHash:
      'b2d9309e5af47b6282c227932e814de9c07be171ae7643130a80c30f5b1dd9f2',
    powSolutions: {
      pk: '03a23641bfb2c47577ff8a529aaee49c2fb501e4cca2370dcfe25af55d17638e07',
      w: '0279be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798',
      n: '2d005273acc50cd1',
      d: '0',
    },
  },
  {
    id: '3064f1130b3bb1c78456761e6468d80c2d40cc20ea330430fefe9c375893526c',
    parentId:
      '17a6e98754266e7eca69ec8e92db32828e96bfd19c1c73b815f3a4bbe87049eb',
    version: 3n,
    timestamp: 1683957235171n,
    height: 1002621n,
    nBits: 118154417n,
    votes: '000000',
    stateRoot:
      'aac51a19c6d7341eb2ad1806556f08e3ebfba91108ce25ee26e3cfb72814c53c19',
    adProofsRoot:
      'c35c6c98b4afb68df75a03dc5de43d3c47ac1d0f2f46e385934cd7e5460e4f9f',
    transactionsRoot:
      '6105521921cc8fb00ec89c3dc65fcfc5b9989b6acbac63d92a4e211c507b560a',
    extensionHash:
      'b2d9309e5af47b6282c227932e814de9c07be171ae7643130a80c30f5b1dd9f2',
    powSolutions: {
      pk: '03677d088e4958aedcd5cd65845540e91272eba99e4d98e382f5ae2351e0dfbefd',
      w: '0279be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798',
      n: 'e3bca800bb8743f1',
      d: '0',
    },
  },
  {
    id: '17a6e98754266e7eca69ec8e92db32828e96bfd19c1c73b815f3a4bbe87049eb',
    parentId:
      'c0e0ce28daca34f781b6cf0b3fff377eecf3826a787b8f657d666bd81ce6d9bf',
    version: 3n,
    timestamp: 1683956910494n,
    height: 1002620n,
    nBits: 118154417n,
    votes: '000000',
    stateRoot:
      '6b3009415ec436fedc96e328541012af5b36af0f1d2cd7596e5f74d8d449b88819',
    adProofsRoot:
      '1e2f0dd12cbf670fa4f3a11cc3a48a217127521479055d1a83d31c05bfd8a980',
    transactionsRoot:
      'fcfcdbf130c29cfbca8e4f3aa5b48badabf6b27ac22e176e46b82085cbf43acc',
    extensionHash:
      'b2d9309e5af47b6282c227932e814de9c07be171ae7643130a80c30f5b1dd9f2',
    powSolutions: {
      pk: '0274e729bb6615cbda94d9d176a2f1525068f12b330e38bbbf387232797dfd891f',
      w: '0279be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798',
      n: 'ac6c0039eeba3f11',
      d: '0',
    },
  },
  {
    id: 'c0e0ce28daca34f781b6cf0b3fff377eecf3826a787b8f657d666bd81ce6d9bf',
    parentId:
      'fbe31b7b7be1e00e2c688a056ed148879101a3c8e15c52bc9e5674e73194cd53',
    version: 3n,
    timestamp: 1683956366865n,
    height: 1002619n,
    nBits: 118154417n,
    votes: '000000',
    stateRoot:
      'cdd17fd904be344220ea8c2a85a2caf04c3fa3fc7ffc88f4fa3f8b24becbc59319',
    adProofsRoot:
      '0d5f1c95b757d889289833c6ec44a8077a718a0afbff5f86b9ae0f82a17521db',
    transactionsRoot:
      '5dbe80c39567e4b540fb886eec0ea4ff2468c13b7a3928a5c2663363b3565270',
    extensionHash:
      'fb429e264170573d9588ff5bf6e47d9c6d0eceb271dd0578d547c90715866629',
    powSolutions: {
      pk: '0295facb78290ac2b55f1453204d49df37be5bae9f185ed6704c1ba3ee372280c1',
      w: '0279be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798',
      n: '9d72dfcfe1057234',
      d: '0',
    },
  },
  {
    id: 'fbe31b7b7be1e00e2c688a056ed148879101a3c8e15c52bc9e5674e73194cd53',
    parentId:
      'a7fc0a1dc9da1797c642b16b385368ea6e1be9b40b7d118042a4fb0447cd6027',
    version: 3n,
    timestamp: 1683956315644n,
    height: 1002618n,
    nBits: 118154417n,
    votes: '000000',
    stateRoot:
      '190683ccec7a776dca7790c38bef6b62144301ada42c88da97f09e918fa8ce2e19',
    adProofsRoot:
      '8b66dddf91eec56c6ccff14bb3105f1a51cb4eaf5da4104e938ef826bf9bda04',
    transactionsRoot:
      '7fbd25a10b5bb06ac999a04f912da4dafedf6be08463ac972ea82c0cd948ae9a',
    extensionHash:
      'fb429e264170573d9588ff5bf6e47d9c6d0eceb271dd0578d547c90715866629',
    powSolutions: {
      pk: '02eeec374f4e660e117fccbfec79e6fe5cdf44ac508fa228bfc654d2973f9bdc9a',
      w: '0279be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798',
      n: '1b5b96a48dd075ac',
      d: '0',
    },
  },
  {
    id: 'a7fc0a1dc9da1797c642b16b385368ea6e1be9b40b7d118042a4fb0447cd6027',
    parentId:
      'fe2d5f5991de8f3cf300a9ca0f163579fad3c2c9600127135bfd09baf0bde40f',
    version: 3n,
    timestamp: 1683956261511n,
    height: 1002617n,
    nBits: 118154417n,
    votes: '000000',
    stateRoot:
      '14e9f96863268054b8c2f32044dac417ea21608dbad2d0e855c01e67e7d4e83919',
    adProofsRoot:
      '95480ac4bd1bb59e67f30d7ab505bdecfac1793833c36ee67324d44587ca9d16',
    transactionsRoot:
      'fd303d39ea21039b2c4aba5bfe26e223839b218adeb988bfd3f32ed58e7ec704',
    extensionHash:
      'b9644bfbee8a288b7f3144b134ada07f44f76f9f23e3c34aa71169fded48351e',
    powSolutions: {
      pk: '02eeec374f4e660e117fccbfec79e6fe5cdf44ac508fa228bfc654d2973f9bdc9a',
      w: '0279be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798',
      n: '15ae0002eaa702f9',
      d: '0',
    },
  },
  {
    id: 'fe2d5f5991de8f3cf300a9ca0f163579fad3c2c9600127135bfd09baf0bde40f',
    parentId:
      '2cddbd212c3960448c8972e2ed68998d935b5932bbb352f9410bd84c42249c4c',
    version: 3n,
    timestamp: 1683956210744n,
    height: 1002616n,
    nBits: 118154417n,
    votes: '000000',
    stateRoot:
      'ed4a259f388e59f246ddb9fd69cc3ec538b053140dd6f0b98ec0defbf82ad4b019',
    adProofsRoot:
      'f288440e7353057810cd032085177b9d6bac3fbd6352f159a55910d7eebd6e7b',
    transactionsRoot:
      '908c07e87af98a5e9b2aa9d29d3aaf352ba48c07953f7080ea48bfd0209a394f',
    extensionHash:
      'b9644bfbee8a288b7f3144b134ada07f44f76f9f23e3c34aa71169fded48351e',
    powSolutions: {
      pk: '03677d088e4958aedcd5cd65845540e91272eba99e4d98e382f5ae2351e0dfbefd',
      w: '0279be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798',
      n: 'fc17b00026f4560e',
      d: '0',
    },
  },
  {
    id: '2cddbd212c3960448c8972e2ed68998d935b5932bbb352f9410bd84c42249c4c',
    parentId:
      '345c18a6093cb5ec814923dad8fcabe7cd09abf47dbf16e5ad71516117c84822',
    version: 3n,
    timestamp: 1683956179153n,
    height: 1002615n,
    nBits: 118154417n,
    votes: '000000',
    stateRoot:
      '1c514485f6ae2c9c3cf8fb36e72153eb47c0dddd930060a10fd57c776d444dbd19',
    adProofsRoot:
      '3058cb6f40dd312f0b68ca6ce493f6c14856b2b845fd2430d7a14540118911a3',
    transactionsRoot:
      'd46380a03985f55fe3b0b4032d80e557fd1bcfed176dd141c60d2280220c5af2',
    extensionHash:
      '1fba672525c1853bb996897aa7bd959347d0ffbad286a3bbb927168491ff6eda',
    powSolutions: {
      pk: '0274e729bb6615cbda94d9d176a2f1525068f12b330e38bbbf387232797dfd891f',
      w: '0279be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798',
      n: 'f776f95b305560a7',
      d: '0',
    },
  },
  {
    id: '345c18a6093cb5ec814923dad8fcabe7cd09abf47dbf16e5ad71516117c84822',
    parentId:
      '4f4ea70e434a511673ff3dd6ee904e8b7d98b024a970ac6a992a0d937905b12e',
    version: 3n,
    timestamp: 1683956091579n,
    height: 1002614n,
    nBits: 118154417n,
    votes: '000000',
    stateRoot:
      '801a42cc43c8d8e42767bd1913e46727cfcd32c7a4ef2373430dfbf38f728e3119',
    adProofsRoot:
      'e0276abd522c2bb9f04addef330a8e333ce93829320d39cad08e41d5cd59c544',
    transactionsRoot:
      'a0c89eecfcf1447102d564185ccabe626000af1729864b363326a3d2ba82ad41',
    extensionHash:
      '69254caa846a6ef24814871f198dfc1b31d4287b33b82db12536b36d4d6fd65e',
    powSolutions: {
      pk: '027c81634e461f843c436bc4267416eb60d42baf17910ad239296f38bc22afe372',
      w: '0279be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798',
      n: 'e368002624f6674c',
      d: '0',
    },
  },
];

export const testBox = {
  boxId: '6f6a2114a14866d0ffd5eab06680d0841dc28f09224658d9efd2e705b0d0abaa',
  transactionId:
    '7615d41687aea39cfd8675b707b3172742736d9effcb324139b05ce47fb39710',
  blockId: '354e675750e163b057d2ff78b5e39be96ec865d4f21f183f70866c42f46456c8',
  value: 28548987000000000n,
  index: 0n,
  globalIndex: 29067790n,
  creationHeight: 1002627n,
  settlementHeight: 1002627n,
  ergoTree:
    '101004020e36100204a00b08cd0279be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798ea02d192a39a8cc7a7017300730110010204020404040004c0fd4f05808c82f5f6030580b8c9e5ae040580f882ad16040204c0944004c0f407040004000580f882ad16d19683030191a38cc7a7019683020193c2b2a57300007473017302830108cdeeac93a38cc7b2a573030001978302019683040193b1a5730493c2a7c2b2a573050093958fa3730673079973089c73097e9a730a9d99a3730b730c0599c1a7c1b2a5730d00938cc7b2a5730e0001a390c1a7730f',
  address:
    '2Z4YBkDsDvQj8BX7xiySFewjitqp2ge9c99jfes2whbtKitZTxdBYqbrVZUvZvKv6aqn9by4kp3LE1c26LCyosFnVnm6b6U1JYvWpYmL2ZnixJbXLjWAWuBThV1D6dLpqZJYQHYDznJCk49g5TUiS4q8khpag2aNmHwREV7JSsypHdHLgJT7MGaw51aJfNubyzSKxZ4AJXFS27EfXwyCLzW1K6GVqwkJtCoPvrcLqmqwacAWJPkmh78nke9H4oT88XmSbRt2n9aWZjosiZCafZ4osUDxmZcc5QVEeTWn8drSraY3eFKe8Mu9MSCcVU',
  assets: [
    {
      tokenId:
        '20fa2bf23962cdf51b07722d6237c0c7b8a44f78856c0f7ec308dc1ef1a92a51',
      index: 0n,
      amount: 1n,
      name: 'Emission Contract NFT',
      decimals: 0n,
      type: 'EIP-004',
    },
    {
      tokenId:
        'd9a2cc8a09abfaed87afacfbb7daee79a6b26f10c6613fc13d3f3953e5521d1a',
      index: 1n,
      amount: 17295104000000000n,
      name: 'Reemission Token',
      decimals: 0n,
      type: 'EIP-004',
    },
  ],
  additionalRegisters: {},
  spentTransactionId: null,
  mainChain: true,
};

export const tokenId =
  '20fa2bf23962cdf51b07722d6237c0c7b8a44f78856c0f7ec308dc1ef1a92a51';
export const tokenApiResponse = {
  id: '20fa2bf23962cdf51b07722d6237c0c7b8a44f78856c0f7ec308dc1ef1a92a51',
  boxId: '5348128964dfd86202ff1ea511b292ac6fe05cd3a75b77da2833bb12e773a65c',
  emissionAmount: 1,
  name: 'Emission Contract NFT',
  description:
    'Token which will be injected into emission contract box on height #777,217 . Marks emission contract box. ',
  type: 'EIP-004',
  decimals: 3,
};
export const expectedTokenDetail = {
  tokenId: tokenId,
  name: 'Emission Contract NFT',
  decimals: 3,
};
