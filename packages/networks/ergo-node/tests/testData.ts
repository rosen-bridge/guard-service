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
  numConfirmations: 4n,
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
      spentTransactionId: null,
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
/**
 * Bytes for previous transaction
 */
export const testTransactionBytes =
  '01389f1b1774840f03b02754fad07d596da9c9407bb92b93e0c2f5ea213a6bfb5b38d08d61ba93ffc85e0c494bf76689c683705e8862184b81ccf985c7accbad1b03b6e6961f33caa9c209bd524eda863b82fc4e50c943d27afc00000002e0b98eed130008cd027304abbaebe8bb3a9e963dfa9fa4964d7d001e6a1bd225eadc84048ae49b627c82dd3c000080ade2041005040004000e36100204a00b08cd0279be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798ea02d192a39a8cc7a701730073011001020402d19683030193a38cc7b2a57300000193c2b2a57301007473027303830108cdeeac93b1a5730482dd3c0000';

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
export const testAddressBalanceWithInvalidTokens = {
  nanoErgs: 10_000_000_000n,
  tokens: [
    {
      tokenId:
        '3d21be3e841fbd6096414375c53d4a010773249ffca823790f56706820215ea1',
    },
    {
      amount: 5n,
    },
    {
      tokenId:
        'b51021bda2dac73022b749061e0e0dea6ba5be5b231abb3861330e6502667840',
      amount: 10n,
    },
  ],
};

export const testPartialTransactions = [
  {
    id: '4ff4f9c43f93eeb6630d742ff76535b969354400462f8c5225934ae70ec5f37e',
  },
  {
    id: '04026bd6af4618b7127519b45f4f766fc0a95b7d3eaea1f10bc64cb7e148b02d',
  },
];
export const testPartialTransactionsWithAbsentIds = [
  {},
  {
    id: '04026bd6af4618b7127519b45f4f766fc0a95b7d3eaea1f10bc64cb7e148b02d',
  },
];

export const testBlockHeaders = {
  parentId: '',
  height: 10n,
};

export const testMempoolTransactions = Array(100).fill(testTransaction);

export const testAddressBoxes = [
  {
    globalIndex: 28571026n,
    inclusionHeight: 989991n,
    address: '9iMjQx8PzwBKXRvsFUJFJAPoy31znfEeBUGz8DRkcnJX4rJYjVd',
    spentTransactionId: null,
    boxId: '93812a42cc7fa8ddd8b788255f07e3e8b930bbed1e44c87895bd47e1abecd16f',
    value: 300000n,
    ergoTree:
      '0008cd03f999da8e6e42660e4464d17d29e63bc006734a6710a24eb489b466323d3a9339',
    assets: [
      {
        tokenId:
          'b37bfa41c2d9e61b4e478ddfc459a03d25b658a2305ffb428fbc47ad6abbeeaa',
        amount: 834825000n,
      },
    ],
    creationHeight: 989988n,
    additionalRegisters: {},
    transactionId:
      '92c773a1911c9c05f7f621a9dac3a52e3ecc7c9da7d8e101fba39983c3bc6021',
    index: 11n,
  },
  {
    globalIndex: 28570014n,
    inclusionHeight: 989949n,
    address: '9iMjQx8PzwBKXRvsFUJFJAPoy31znfEeBUGz8DRkcnJX4rJYjVd',
    spentTransactionId: null,
    boxId: '3a9fdeaed92cf09b12db6de5f347be526b4e27036807d8ee7b3d5a45558c36a0',
    value: 2282206360n,
    ergoTree:
      '0008cd03f999da8e6e42660e4464d17d29e63bc006734a6710a24eb489b466323d3a9339',
    assets: [
      {
        tokenId:
          '4ed6449240d166b0e44c529b5bf06d210796473d3811b9aa0e15329599164c24',
        amount: 44999999980999999n,
      },
      {
        tokenId:
          'a1143e81c5ab485a807e6f0f76af1dd70cc5359b29e0b1229d0edfe490d33b67',
        amount: 4831963150n,
      },
      {
        tokenId:
          'c59e86ef9d0280de582d6266add18fca339a77dfb321268e83033fe47101dc4d',
        amount: 499999081615899n,
      },
      {
        tokenId:
          '51c1745883a62db6cf47f5765bd695317a01e54bcaaaeaa4aab0b517d2f46a24',
        amount: 99999999979881465n,
      },
    ],
    creationHeight: 989947n,
    additionalRegisters: {},
    transactionId:
      'c2e9fb8fbc6feb7ad99b8833cdcb5dd05a7d4280c369a81348da56f26f4afea5',
    index: 1n,
  },
  {
    globalIndex: 28553556n,
    inclusionHeight: 989484n,
    address: '9iMjQx8PzwBKXRvsFUJFJAPoy31znfEeBUGz8DRkcnJX4rJYjVd',
    spentTransactionId: null,
    boxId: 'e8a88c9996e87fc56bddeadbab5c14208a2870876990ec82a4f1102d139d0743',
    value: 300000n,
    ergoTree:
      '0008cd03f999da8e6e42660e4464d17d29e63bc006734a6710a24eb489b466323d3a9339',
    assets: [
      {
        tokenId:
          '38cb230f68a28436fb3b73ae4b927626673e4620bc7c94896178567d436e416b',
        amount: 1991000n,
      },
    ],
    creationHeight: 989480n,
    additionalRegisters: {},
    transactionId:
      '1dabc2768e8bd12df5105e8d66923b2ac7706a6243c5494766dfc8b86c8fec6a',
    index: 11n,
  },
  {
    globalIndex: 28552269n,
    inclusionHeight: 989437n,
    address: '9iMjQx8PzwBKXRvsFUJFJAPoy31znfEeBUGz8DRkcnJX4rJYjVd',
    spentTransactionId: null,
    boxId: 'bb6c3731d9b16b2debe0d5be9a5d4d42240f8b30bd7af6492be5336c42e9fec6',
    value: 9345466817n,
    ergoTree:
      '0008cd03f999da8e6e42660e4464d17d29e63bc006734a6710a24eb489b466323d3a9339',
    assets: [
      {
        tokenId:
          '12ce98b66db4f53fc56fbc5a3eac05d76b9b11eeec50ef3d67dbc6dd349ef42a',
        amount: 1n,
      },
      {
        tokenId:
          '246eb5dd39a11d96d2bc7373b3166835fc72998b045d67ea7adce842c4585a62',
        amount: 10n,
      },
      {
        tokenId:
          'c59e86ef9d0280de582d6266add18fca339a77dfb321268e83033fe47101dc4d',
        amount: 499999996990000n,
      },
      {
        tokenId:
          'a1143e81c5ab485a807e6f0f76af1dd70cc5359b29e0b1229d0edfe490d33b67',
        amount: 999959074899599n,
      },
      {
        tokenId:
          'a599bb94b230f8d3ac94856ab24c31b235ab493d3415097102916c600fbbf969',
        amount: 98n,
      },
      {
        tokenId:
          '3443950555c6088a4b3fbd99b853a1db89765c9c7be318a6134db2ee0f8ecbca',
        amount: 10n,
      },
      {
        tokenId:
          '45e873d4e5af0d0fd6905ef51053fa7e9c672cd26b23b8a7f4feb17254f25392',
        amount: 196n,
      },
      {
        tokenId:
          '844e3cf44b3181b4cacbccbf7596d341f41147d73daf4b565ecaac983aba2508',
        amount: 9919999998n,
      },
      {
        tokenId:
          '4b1e5bcfbd6763b9cea8411841213611258fabed16293af6aa8cd8200b7e1286',
        amount: 98n,
      },
      {
        tokenId:
          '1ea49e1c052803576e91275b27dffbae3f4ccad9da5219bcda51ea5006fe7661',
        amount: 196n,
      },
      {
        tokenId:
          '4ed6449240d166b0e44c529b5bf06d210796473d3811b9aa0e15329599164c24',
        amount: 2400000n,
      },
      {
        tokenId:
          '65214ca53fbf09c0875d71f67f28a0471a4d6d4f66c38ae47b6a417e645f68fd',
        amount: 10n,
      },
      {
        tokenId:
          'c79e1748e862a80c4f7193077b600f9ffb65c612297f9a8829407044c1eb1066',
        amount: 10n,
      },
      {
        tokenId:
          '51c1745883a62db6cf47f5765bd695317a01e54bcaaaeaa4aab0b517d2f46a24',
        amount: 900000000000000000n,
      },
    ],
    creationHeight: 989435n,
    additionalRegisters: {},
    transactionId:
      '93bad4141786dea1930317ce0419f22ba54d2dd9350b7aba7395007769ae64b7',
    index: 1n,
  },
];
/**
 * Bytes for previuos boxes
 */
export const testAddressBoxesBytes = [
  'e0a7120008cd03f999da8e6e42660e4464d17d29e63bc006734a6710a24eb489b466323d3a9339a4b63c01b37bfa41c2d9e61b4e478ddfc459a03d25b658a2305ffb428fbc47ad6abbeeaaa8d6898e030092c773a1911c9c05f7f621a9dac3a52e3ecc7c9da7d8e101fba39983c3bc60210b',
  '98e99ec0080008cd03f999da8e6e42660e4464d17d29e63bc006734a6710a24eb489b466323d3a9339fbb53c044ed6449240d166b0e44c529b5bf06d210796473d3811b9aa0e15329599164c24bfaa8aaeafe8f74fa1143e81c5ab485a807e6f0f76af1dd70cc5359b29e0b1229d0edfe490d33b678ed0878012c59e86ef9d0280de582d6266add18fca339a77dfb321268e83033fe47101dc4d9ba497ddf1d77151c1745883a62db6cf47f5765bd695317a01e54bcaaaeaa4aab0b517d2f46a24f987dce285afd1b10100c2e9fb8fbc6feb7ad99b8833cdcb5dd05a7d4280c369a81348da56f26f4afea501',
  'e0a7120008cd03f999da8e6e42660e4464d17d29e63bc006734a6710a24eb489b466323d3a9339a8b23c0138cb230f68a28436fb3b73ae4b927626673e4620bc7c94896178567d436e416bd8c279001dabc2768e8bd12df5105e8d66923b2ac7706a6243c5494766dfc8b86c8fec6a0b',
  'c183a2e8220008cd03f999da8e6e42660e4464d17d29e63bc006734a6710a24eb489b466323d3a9339fbb13c0e12ce98b66db4f53fc56fbc5a3eac05d76b9b11eeec50ef3d67dbc6dd349ef42a01246eb5dd39a11d96d2bc7373b3166835fc72998b045d67ea7adce842c4585a620ac59e86ef9d0280de582d6266add18fca339a77dfb321268e83033fe47101dc4db0a4d591f5d771a1143e81c5ab485a807e6f0f76af1dd70cc5359b29e0b1229d0edfe490d33b678f8dccebd1aee301a599bb94b230f8d3ac94856ab24c31b235ab493d3415097102916c600fbbf969623443950555c6088a4b3fbd99b853a1db89765c9c7be318a6134db2ee0f8ecbca0a45e873d4e5af0d0fd6905ef51053fa7e9c672cd26b23b8a7f4feb17254f25392c401844e3cf44b3181b4cacbccbf7596d341f41147d73daf4b565ecaac983aba2508fedf9cfa244b1e5bcfbd6763b9cea8411841213611258fabed16293af6aa8cd8200b7e1286621ea49e1c052803576e91275b27dffbae3f4ccad9da5219bcda51ea5006fe7661c4014ed6449240d166b0e44c529b5bf06d210796473d3811b9aa0e15329599164c2480be920165214ca53fbf09c0875d71f67f28a0471a4d6d4f66c38ae47b6a417e645f68fd0ac79e1748e862a80c4f7193077b600f9ffb65c612297f9a8829407044c1eb10660a51c1745883a62db6cf47f5765bd695317a01e54bcaaaeaa4aab0b517d2f46a248080e8ceb4a7dcbe0c0093bad4141786dea1930317ce0419f22ba54d2dd9350b7aba7395007769ae64b701',
];

export const testLastBlockHeaders = [
  {
    extensionId:
      'cbae7fabffcc91490956e843a94ca5778adfd4a92383bd4690795ea153541ea3',
    difficulty: '2800709519015936',
    votes: '000000',
    timestamp: 1683618891108n,
    size: 220n,
    stateRoot:
      '39bf4d63cb4145ac0876cabbb23b522c7097fa69c36e7e771d94e7c63d06e0fd19',
    height: 999868n,
    nBits: 118092603n,
    version: 3n,
    id: 'fb4cc9ed02e504a18664d91802ea9952dbfeef5990bcae76b2cec0ea0d0df46a',
    adProofsRoot:
      '165f3de7e7ca30c4ef3d074b05f2bb8ba322352493cb5d884965380c32aad5a9',
    transactionsRoot:
      'f73da3ef130df23961d854fbaa823d919720b4b2efc93ec66f69c2d82568cd44',
    extensionHash:
      '6720d86c5d358ae0e0aaec775dfd71bc9420fc54da6b304c612e5f191ce2002f',
    powSolutions: {
      pk: '0274e729bb6615cbda94d9d176a2f1525068f12b330e38bbbf387232797dfd891f',
      w: '0279be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798',
      n: '91b60d53a621caaa',
      d: 0n,
    },
    adProofsId:
      'ae093705c8ab7f252d98d4990645251e17a3ae7f9ad7470db3f3ce6627c80979',
    transactionsId:
      'd53bfe467061cb2272e2f5ce8ca1b7830d337b241f88577f9c412ec53edf4b15',
    parentId:
      '904c6e2d61a66eb2539bb44d38f2890df1b34d48eb8bf3935f670b0280cfff73',
  },
  {
    extensionId:
      '6b2fbd1d900c635060a365f880bec8b4a02d8f451a2dcea66e6faec3a7e2c1ba',
    difficulty: '2800709519015936',
    votes: '000000',
    timestamp: 1683618914758n,
    size: 220n,
    stateRoot:
      '57fd5b73a18d4a6d9c48a0eb6b2f236b27347ebdf06edb184e07497f1b07546e19',
    height: 999869n,
    nBits: 118092603n,
    version: 3n,
    id: 'f589f338ecf1bd8bc4875828a9bcfc335bef69447543bbcce9c57f0deb983bb6',
    adProofsRoot:
      'ae9980c6b560f1ca4385bd261d2eddb77eb2638da52d58ca5ebac0acfa33652b',
    transactionsRoot:
      '3f60225d9fa4fbf4f1ca1d9524f89e52792682a2fdc695fdecc4721b041a00d7',
    extensionHash:
      '9877ef82f9bf697e2a9e52ac1c98449ef941ee13cafcd2b83abf987c68abd0ec',
    powSolutions: {
      pk: '0274e729bb6615cbda94d9d176a2f1525068f12b330e38bbbf387232797dfd891f',
      w: '0279be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798',
      n: 'a4ed002d00bf0cca',
      d: 0n,
    },
    adProofsId:
      '4f0ebb62e5acecd97c97f056a698d3c4a502e390caf7e9c40b41c4f0749a01db',
    transactionsId:
      '06ea690a02a50addde42e96fd2583b48a33067a5936719dabf79809af102c3d8',
    parentId:
      'fb4cc9ed02e504a18664d91802ea9952dbfeef5990bcae76b2cec0ea0d0df46a',
  },
  {
    extensionId:
      '1ed1202a4a3efcb133386dae4fe390ed97a75a7f65245b252c887a347bbe2a79',
    difficulty: '2800709519015936',
    votes: '000000',
    timestamp: 1683619033579n,
    size: 220n,
    stateRoot:
      'e337275fbcfad6d3357a0c334490115487ba0d8d3aa6d79ad4ed6f95b228b6d919',
    height: 999870n,
    nBits: 118092603n,
    version: 3n,
    id: '3eecd24559bf6e4fe3da60b7c78bcd5a0697be73dbdb61660f069e2baa749e06',
    adProofsRoot:
      'abc5719c2db5f196d27c548b68d21ed109211d3aa30ec4644bcf6ab35c3da070',
    transactionsRoot:
      '7c088c8ade97a93b70af263c8179d20e8adf4cf10f2c6a69c88c1087506c5d66',
    extensionHash:
      '25ef071a043e67ac0d538fb3e042289503dadd59d5f546d55fc8fdd588713526',
    powSolutions: {
      pk: '033133187bde16d8b847923852ac7fe5bfbb50a81f1c040d00850e1f776c18e1b5',
      w: '0279be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798',
      n: 'a8c702f6dd5d558a',
      d: 0n,
    },
    adProofsId:
      '594e0ab3f1ba997d3f3af9d077dddf224df1de517b0c781c1aeaec423a80b7b4',
    transactionsId:
      '986a86c773a5f08c507926dec297616b0fad08c7583c927f19ad07ecb5a14939',
    parentId:
      'f589f338ecf1bd8bc4875828a9bcfc335bef69447543bbcce9c57f0deb983bb6',
  },
  {
    extensionId:
      '1786571af68943cfb74ce99ae8bde426172f8f309da40ae78fb5574f66e5bb75',
    difficulty: '2800709519015936',
    votes: '000000',
    timestamp: 1683619362555n,
    size: 220n,
    stateRoot:
      'c259c30c3169dbad3513efa63cf9cb6390f7eaebf94c795adcd7ff8134cc941d19',
    height: 999871n,
    nBits: 118092603n,
    version: 3n,
    id: '5c7f0085ec697b6dd4f0d56ad50c1ebbebc200fa67363e2511af0b551a5bf6ab',
    adProofsRoot:
      'ca75b54477e69ef550bbe19f8cbb55afe2d9d0c5736ba04aff7fee966cab7075',
    transactionsRoot:
      'f9f325d67aff7905d9d540eb7c330e7e5cd4376d141172c9b36fe829ccd71477',
    extensionHash:
      '807bd29404e27edc59ab9e5cfacc308443e20ce9578d3d1f8d4107ba39ff9057',
    powSolutions: {
      pk: '03677d088e4958aedcd5cd65845540e91272eba99e4d98e382f5ae2351e0dfbefd',
      w: '0279be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798',
      n: 'b3525e003b5fa3b9',
      d: 0n,
    },
    adProofsId:
      'd2d5ae98a0d43cab36a43ce553dcfd9b2255399fe37ce271289c1a57150a5e94',
    transactionsId:
      '015ecd49ab603604c02043019f307fdc656900d9ff5b186931d9de1cb147bab9',
    parentId:
      '3eecd24559bf6e4fe3da60b7c78bcd5a0697be73dbdb61660f069e2baa749e06',
  },
  {
    extensionId:
      '802ac3b25f5598ac9ace57b8c39d536f44dcd9ba66d20385a1ff34a310dee57c',
    difficulty: '2800709519015936',
    votes: '000000',
    timestamp: 1683619439615n,
    size: 220n,
    stateRoot:
      'd1c3a75bb2c5fbc9a34759776228d694189acd26bd1023c3f5097aac755944ed19',
    height: 999872n,
    nBits: 118092603n,
    version: 3n,
    id: '2087922d81e3e84639f1f421b53bc1c4e8d374fb5cabfb856786a137557512be',
    adProofsRoot:
      'd1cf0b051b2703410f447a98c3f30298960d0b483c5bd24126243b065c61776c',
    transactionsRoot:
      '44bb81d3be358fba6a30e887cf98d165027981e2f1b31b53f324554b89c5e0b7',
    extensionHash:
      '037f590cf7aacd19cf0eb4185339136df2521459f25c5864af2489e0dcc76780',
    powSolutions: {
      pk: '0274e729bb6615cbda94d9d176a2f1525068f12b330e38bbbf387232797dfd891f',
      w: '0279be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798',
      n: 'd1bc038a66f2d4d6',
      d: 0n,
    },
    adProofsId:
      '8e225750ff77c41163714c5b933205b86ebac7016d063346a834eec5775d969b',
    transactionsId:
      '477469b62083f355164a2a3a1872db53b007b254da2f284fd15cfc854ff6049c',
    parentId:
      '5c7f0085ec697b6dd4f0d56ad50c1ebbebc200fa67363e2511af0b551a5bf6ab',
  },
  {
    extensionId:
      'a647f05412a34835647d0c8fdd17046ebd551fe19fd27c42c01ffe8d90e59404',
    difficulty: '2800709519015936',
    votes: '000000',
    timestamp: 1683619447815n,
    size: 220n,
    stateRoot:
      '8b17d6bc01a5ce0bb04cc4bc2f4fdf529627157db1bb57728cef8f50466ccb3619',
    height: 999873n,
    nBits: 118092603n,
    version: 3n,
    id: '5f77c658d865e3a5fb8fc12d576d016b7d8a38497a72980c186a22840918cd6d',
    adProofsRoot:
      'f907a07ca7dd72e958c0effdffd783a5a9a35b20ca5e8df1ee2127077cb70c3d',
    transactionsRoot:
      'e02607b2a852cc211d1ae7929654819a41e487bcc127462587f2ede18f0f2b51',
    extensionHash:
      '037f590cf7aacd19cf0eb4185339136df2521459f25c5864af2489e0dcc76780',
    powSolutions: {
      pk: '028deb6618b1e889f1087659f82ae7041f4431256a66e79a06e1f652885252b7e4',
      w: '0279be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798',
      n: 'f6fe1006a47a297e',
      d: 0n,
    },
    adProofsId:
      'b9306682a965f5da4bca0c550891bece6706c887c3f0a4b2b2f6baff2568fd3e',
    transactionsId:
      '8562a7848769299d0ab248e96fe22ef3bdf522d5017a7044cab6bec32bd7a507',
    parentId:
      '2087922d81e3e84639f1f421b53bc1c4e8d374fb5cabfb856786a137557512be',
  },
  {
    extensionId:
      '8f8dabe7986291b7d4416c0bd319848b6142772ee5b5b19625a109b996644b04',
    difficulty: '2800709519015936',
    votes: '000000',
    timestamp: 1683619660692n,
    size: 220n,
    stateRoot:
      '0e3eabb840d82a2aac3e2e08d6c9d4151e431ac78ba67a36ecf2109f679b1d3519',
    height: 999874n,
    nBits: 118092603n,
    version: 3n,
    id: 'a008f6d554677e438b6697488b80bcc7e6e1f17cd2f5144436dc9a2dfe5e10f0',
    adProofsRoot:
      '5c738c4a2f59ec815718642dca0486751ceeb88eb28aa78aff884648a9e2b891',
    transactionsRoot:
      '596005afbd04838cff17e1a7c6ddd663926deff3361e59774a58dd1301581c39',
    extensionHash:
      '545cfdd52e5ffa2dd1c3ea3172e825f9637a4ea24db0fa1b3e3e8ac8576b9187',
    powSolutions: {
      pk: '033133187bde16d8b847923852ac7fe5bfbb50a81f1c040d00850e1f776c18e1b5',
      w: '0279be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798',
      n: 'f4d203fec2980d9b',
      d: 0n,
    },
    adProofsId:
      '8b50681e947996b716cfb048a00792d490673ded4f30759dba917d1fe25dd5e3',
    transactionsId:
      '54d6e77a7b31db8b9d76f8c985a4c87861b60665206497f0d81b7820cdca64f0',
    parentId:
      '5f77c658d865e3a5fb8fc12d576d016b7d8a38497a72980c186a22840918cd6d',
  },
  {
    extensionId:
      '35393c26e6800b4cec165902743c05961e04aed261839892cbe4a34f3724cfcf',
    difficulty: '2800709519015936',
    votes: '000000',
    timestamp: 1683619718949n,
    size: 220n,
    stateRoot:
      'db8ae5634b42cc50a5a8a57f291cb3e70dd3285e889c77a59108f8fcc080267619',
    height: 999875n,
    nBits: 118092603n,
    version: 3n,
    id: '2f5326f477914fdf9dc2ccbbb11181cb903f540f2b64e5fba68f833f4bf1644d',
    adProofsRoot:
      '15cb006f1c9c950676f2d12e8618142af07f9a681ffd5adb202ceaaf24295dd1',
    transactionsRoot:
      '369d0ba14ef6dd94b4246db67114dcb3b99a13adc6f57653ae8146a11db4a922',
    extensionHash:
      '545cfdd52e5ffa2dd1c3ea3172e825f9637a4ea24db0fa1b3e3e8ac8576b9187',
    powSolutions: {
      pk: '02eeec374f4e660e117fccbfec79e6fe5cdf44ac508fa228bfc654d2973f9bdc9a',
      w: '0279be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798',
      n: '363d437b6c1ad568',
      d: 0n,
    },
    adProofsId:
      'ec14252a1ddb1847aeac3009baec8a0c79b0423d8072ddd5ca3d53ad464c921d',
    transactionsId:
      '031c7368b42e52e3714aaf12f7a7a15a0008e411eebc090507932ddec335f8a7',
    parentId:
      'a008f6d554677e438b6697488b80bcc7e6e1f17cd2f5144436dc9a2dfe5e10f0',
  },
  {
    extensionId:
      '0cda7d4cce87081120588acc59bf4d9b89b03e89afc877a5f2f035324a9fd88f',
    difficulty: '2800709519015936',
    votes: '000000',
    timestamp: 1683619784404n,
    size: 220n,
    stateRoot:
      '7cebe7852dadc46a946ef4464775cffe11e670fcfb1faf4ee427caf25655da2219',
    height: 999876n,
    nBits: 118092603n,
    version: 3n,
    id: '113fb4b2de7a64e978aa20af4015b171a7a77e316aefed2ab09178d6157b9041',
    adProofsRoot:
      '2430a0f3ff1f63328a6acc18a45e3bd578303c44a9cdcada71afe1017a5dcc07',
    transactionsRoot:
      '5847992d0fd62bf444579cdb1f870b9fcc5d50d3a9642874fca67675b51685fa',
    extensionHash:
      '545cfdd52e5ffa2dd1c3ea3172e825f9637a4ea24db0fa1b3e3e8ac8576b9187',
    powSolutions: {
      pk: '02eeec374f4e660e117fccbfec79e6fe5cdf44ac508fa228bfc654d2973f9bdc9a',
      w: '0279be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798',
      n: '7a310005f1600c1b',
      d: 0n,
    },
    adProofsId:
      '1b7431ab5cf98cf386138a06383b06cdfa1dc9c6fc325cfcd159338d8035ea05',
    transactionsId:
      '2c6a33b912b5072b6f2551291d22ae056fed606c97b3c309f313734d09041da9',
    parentId:
      '2f5326f477914fdf9dc2ccbbb11181cb903f540f2b64e5fba68f833f4bf1644d',
  },
  {
    extensionId:
      '4474845eff8a94ea452aefbef2cd3c1327262fd50958273147881986865d8378',
    difficulty: '2800709519015936',
    votes: '000000',
    timestamp: 1683619854589n,
    size: 220n,
    stateRoot:
      'ca9a417e8bd7f9d9ce470ff435083b15481b1ca9d8c6c88df211b4353476c12e19',
    height: 999877n,
    nBits: 118092603n,
    version: 3n,
    id: '1c5ffe42211cddde094401cc16a068b23a0f7878da6ee55945d31e54ca374045',
    adProofsRoot:
      'eabe46fd9eb16e4e84777a000e95e68792570110be15a7e3349166ad1f7942c9',
    transactionsRoot:
      'ed3e5315f53c5c4120ea211b9a873c9370477dfd3d28f4f33e443c6af6854be7',
    extensionHash:
      '545cfdd52e5ffa2dd1c3ea3172e825f9637a4ea24db0fa1b3e3e8ac8576b9187',
    powSolutions: {
      pk: '0274e729bb6615cbda94d9d176a2f1525068f12b330e38bbbf387232797dfd891f',
      w: '0279be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798',
      n: '79ff11992263f6d0',
      d: 0n,
    },
    adProofsId:
      'bce1b00a82179e1f91da5b97eca75bee081a948bbd2c3dea599618549f05892d',
    transactionsId:
      '48f2763eedc96a2a379d9508bf15b8fdfb81aaea26becb6502cbc281136ee874',
    parentId:
      '113fb4b2de7a64e978aa20af4015b171a7a77e316aefed2ab09178d6157b9041',
  },
];

export const tokenId =
  '53cd2b0267fc6fb5fc7bb2c67d1e1a002641abee9e7c3471bc6583d0e29f46ef';
export const tokenApiResponse = {
  id: '53cd2b0267fc6fb5fc7bb2c67d1e1a002641abee9e7c3471bc6583d0e29f46ef',
  boxId: 'c01a86713d318abe6921843a6bdd1ac06bbe86d70163b4572dfa40155aedc482',
  emissionAmount: 9223372036854776000,
  name: 'SPF_ERG_SigUSD_LP_YF',
  description:
    'The representation of your share in the SPF/ERG_SigUSD_LP (pool id: 4136eba32fe50118ce0c556b83f85c0460da975489a3a5f3d0450fef0ab40dd5) yield farming pool on the Spectrum Finance platform.',
  decimals: 3,
};
export const expectedTokenDetail = {
  tokenId: tokenId,
  name: 'SPF_ERG_SigUSD_LP_YF',
  decimals: 3,
};
