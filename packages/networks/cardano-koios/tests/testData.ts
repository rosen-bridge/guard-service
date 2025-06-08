import { CardanoUtxo } from '@rosen-chains/cardano';
import { TxCborItem, UtxoInfos } from '@rosen-clients/cardano-koios';

export const blockHeight = 8000000n;
export const absoluteSlot = 76592831n;
export const txId =
  'e914fd3ed0735da7731c6e2e23f358d6fc90e5188efc028cd0c49e2d8bb2e77a';
export const address =
  'addr1qxxa3kfnnh40yqtepa5frt0tkw4a0rys7v33422lzt8glx43sqtd4vkhjzawajej8aujh27p5a54zx62xf3wvuplynqs3fsqet';
export const addressBalance = '99000000';
export const addressAssets = [
  {
    address: address,
    decimals: 0n,
    quantity: '15888202094',
    policy_id: '0dad352d8f0d5ce3f5be8b025d6a16141ecceab5a921871792d91f47',
    asset_name: '5273455247',
    fingerprint: 'asset1p40r0eun2alszlxhj7k4uylya4cj54lxkjjmsm',
  },
  {
    address: address,
    decimals: 0n,
    quantity: '1866325',
    policy_id: '8e3e19131f96c186335b23bf7983ab00867a987ca900abb27ae0f2b9',
    asset_name: '52535457',
    fingerprint: 'asset1vwun0a52xjv5tc2x92wgr6x3p6q3u4frnmq8q0',
  },
];
export const blockId =
  '9c6e26dcdde688388370410df7cd0bbaa12acf563cd4b76e76dc3d36a9cc533b';
export const parentBlockId =
  '6dc89c6e28360410df837ddebad0b8c2a7c73f561cd4ba66a976dc3d3bce';
export const txHashes = [
  {
    block_hash: blockId,
    tx_hash: '65eebe2262738d1c3a2ac57ce7aa7987613cd8835e7ffe1b44be6cc513464e9a',
  },
  {
    block_hash: blockId,
    tx_hash: 'ffc5558b0041a0531c2e99ced50c066c77afb56c0608716632bde93e92572d95',
  },
  {
    block_hash: blockId,
    tx_hash: '51b640cf0a9b5a241d3fd39174ce414e53b375c1f53904951dd59fa420c29141',
  },
];
export const oldBlockheight = 7000000n;
export const noMetadataTxId =
  '5ecf1335f943526c84e5a53201e21344ccbbeda93f9fcae4c642b78214cd1052';
export const noMetadataTxBlockId =
  '2e182672a18fa13e6941cd362e28d07854ba3828e63fc8419df908e38972bc44';
export const noMetadataTxKoiosResponse: TxCborItem = {
  tx_hash: '5ecf1335f943526c84e5a53201e21344ccbbeda93f9fcae4c642b78214cd1052',
  block_hash:
    '2e182672a18fa13e6941cd362e28d07854ba3828e63fc8419df908e38972bc44',
  block_height: 8780451,
  epoch_no: 412,
  absolute_slot: 92665669,
  tx_timestamp: 1684231960,
  cbor: '84a400818258204f868ccfc7abfc70a154e4fbe6e8c671add4852716fbb56bc713305744360f2200018282581d616be553ecaf3765b0e5c214b7d4129d4008875fd0b2862cd4cc38a1701a241e13d482581d616be553ecaf3765b0e5c214b7d4129d4008875fd0b2862cd4cc38a1701a002b348c021a00029234031a05860ea9a10081825820663642b0646dd3eca24d7b5e031c916f52bd9f8a378c2b2dac1510915805df0c584075c0c20a6aa93c12fc8f2d6fcb473455301c213746b4e804facd713ae010195308bb326ac508fb502288868e9820e41995e40f28df8425ecca31d2a49a274001f5f6',
};
export const expectedNoMetadataTxResponse = `{"id":"5ecf1335f943526c84e5a53201e21344ccbbeda93f9fcae4c642b78214cd1052","inputs":[{"txId":"4f868ccfc7abfc70a154e4fbe6e8c671add4852716fbb56bc713305744360f22","index":0}],"outputs":[{"address":"addr1v94725lv4umktv89cg2t04qjn4qq3p6l6zegvtx5esu2zuqfd487u","value":605950932,"assets":[]},{"address":"addr1v94725lv4umktv89cg2t04qjn4qq3p6l6zegvtx5esu2zuqfd487u","value":2831500,"assets":[]}],"fee":168500}`;

export const rosenMetadataTxId =
  '98884bf40d8ebbd89ad78c6deaa31f0cc47938d941bfc0452bbc9a13aeb37cd3';
export const rosenMetadataTxBlockId =
  '4d321fbd03eca67baa9e581b1355a14d7193f1193494f3be40898ff1110f04e0';
export const rosenMetadataTxKoiosResponse: TxCborItem = {
  tx_hash: '98884bf40d8ebbd89ad78c6deaa31f0cc47938d941bfc0452bbc9a13aeb37cd3',
  block_hash:
    '4d321fbd03eca67baa9e581b1355a14d7193f1193494f3be40898ff1110f04e0',
  block_height: 8555968,
  epoch_no: 401,
  absolute_slot: 88050680,
  tx_timestamp: 1679616971,
  cbor: '84a40081825820ed688bc21f5ed822adadd1f61415821def778201323c8e998baf350e0647ce4900018282581d61cc1e2d66086462a554a4c0813ccc2e01c06eb36e76dd50a268ab314f1a0013a2c982583901068186ed813df5f543ee541e1ee1a6dca4cc2ce1e197bc66ee842de2b0bd5044d9b70b9203fe77a7cb4d6a2d7967181703e2e78291ddde18821a00160aa6a1581c8e3e19131f96c186335b23bf7983ab00867a987ca900abb27ae0f2b9a144525354571905af021a000419510758200d1ff2979248ea2ef6069a00095b2fd6a358646f54e65c5e7c7da5901284e759a10082825820b32aa9008c013f71477787c47ef82dfe170eed2b5a1632ead59018df2b5bb0dc5840592b32cab3744cc209dc86d39731365db4b0b89a2cdae2a3dbc26220e015c6360a5ea004f713253db9fb402c75e545b8632b1d915c8ebcb2446c62d058fc2308825820602000cec8e7add2c97a7e4d38ae4a0a60864e94313e1102ce4fce10d725198c5840facf2058819a335b14c322ca05225d62e7cce6a07073e8b80fa0ca9130683e33c33d79ed70aa72194eadf4943ecffd4887740223ead35ae25abd098db186a606f5a100a562746f646572676f69627269646765466565663330303030306a6e6574776f726b4665656635303030303069746f41646472657373783339685a785633594e536662437153364745736573374468415653617476616f4E746473694E766b696d504747326338667a6b476b66726f6d41646472657373827840616464723171797267727068647379376c746132726165327075386870356d7732666e7076753873653030727861367a7a6d63347368346779666b6468707766782771386c6e68356c39353636336430396e337339637275746e63397977616d637671733565356d36',
};
export const expectedRosenMetadataTxResponse = `{"id":"98884bf40d8ebbd89ad78c6deaa31f0cc47938d941bfc0452bbc9a13aeb37cd3","inputs":[{"txId":"ed688bc21f5ed822adadd1f61415821def778201323c8e998baf350e0647ce49","index":0}],"outputs":[{"address":"addr1v8xputtxppjx9f255nqgz0xv9cquqm4ndemd659zdz4nznc7guuzv","value":1286857,"assets":[]},{"address":"addr1qyrgrphdsy7lta2rae2pu8hp5mw2fnpvu8se00rxa6zzmc4sh4gyfkdhpwfq8lnh5l95663d09n3s9crutnc9ywamcvqs5e5m6","value":1444518,"assets":[{"policyId":"8e3e19131f96c186335b23bf7983ab00867a987ca900abb27ae0f2b9","assetName":"52535457","quantity":1455}]}],"fee":268625,"metadata":{"0":{"bridgeFee":"300000","fromAddress":["addr1qyrgrphdsy7lta2rae2pu8hp5mw2fnpvu8se00rxa6zzmc4sh4gyfkdhpwf","q8lnh5l95663d09n3s9crutnc9ywamcvqs5e5m6"],"networkFee":"500000","to":"ergo","toAddress":"9hZxV3YNSfbCqS6GEses7DhAVSatvaoNtdsiNvkimPGG2c8fzkG"}}}`;

export const differentMetadataTxId =
  'dd8fc82e9ca2d38cffdfb2ab9ec51ea8158f7ade67b95c2dece63de3b8f836a7';
export const differentnoMetadataTxBlockId =
  '87d22e3a156ea1a984bbf7758c29c7efb58cf1b6a4e05e853c3e30d42262ae9c';
export const differentMetadataTxKoiosResponse: TxCborItem = {
  tx_hash: 'dd8fc82e9ca2d38cffdfb2ab9ec51ea8158f7ade67b95c2dece63de3b8f836a7',
  block_hash:
    '87d22e3a156ea1a984bbf7758c29c7efb58cf1b6a4e05e853c3e30d42262ae9c',
  block_height: 8780716,
  epoch_no: 412,
  absolute_slot: 92670712,
  tx_timestamp: 1684237003,
  cbor: '84a800828258206173600230d8e09bd61520c4f451ab9f1efca9e3a082a149bcc69148969976950182582086bd079733207c6b4ba764fb5408fa59b74ef1733e8b3f9f6e8ef41ac3c048f900018282583901b61428273247678082a5a1202ec58f1f56375dfb611769b71caacc4182c472d53831dfb7edf83259cd407ee7615d9a5271b22ade3bd6c38d1a1310845383581d71f0c16278fb2dceaa8c32b52f282d6f57ccb6068077a56c7a8f0707a7821a3956f480a1581c40fa2aa67258b4ce7b5782f74831d46a84c59a0ff0c28262fab21728a14e436c61794e6174696f6e39353837015820f12f4e3c4624767d580206eb0293b564e98cffd31f485494ce20644d97cb72a0021a00037961031a05860c6a0758204f58d2ac11ba5bc5a5bd515961a25f619773a017db639697b9ea8402c6eb88b30b582020b1ac3022b50847d2ac9deb20378d3f9beaf2c40bc1acd8bd0dbdc318c9e7090d81825820f8b1f77f72c28b2a99ebab191b28d9d7959f0fc9f07c912470050b9ea9a82ce6040e81581ca08ee6a678a207de52061c4ef98209525c9a8af8fe47bbadda50cb85a40083825820ed30ebf18a086c42b6e85b6051703f730cd0843d2e92a8a2246f92365a41405b58404b0ef06e170a795248474333df870924848713151d18804ffed254b3e55683c286e74a5f245d8847b608975e68282c06947f332b8c3a5c28b8021fce40b50a0c825820d302443d6d2661326a41faf152f3b97521e961f6dccdf455ed1b594518c8df875840941e36a149ac5757ccb766c99433387b793752a9812f22eb58e3541b4b2cdac1d83174a74b515f85afce8db42bc023d4ea9050478136337fa1c89af55145a200825820e2c72ac2090da14abddc841d6f3bad06e17a472e6e36c88a45d7f2083b59c9bb584092b32fb76501e115a5e0dba8c59f90b90c146b8967fb47dadef183ce465370a1405ccd5b4cbff00b8eade62ba5a91f7299407ca395e168d1fb9da2749f803f07068158ad58ab0100003232222533357346464640026464660026eb0cc00cc010cc00cc010015200048040020c004004888c94ccd55cf8008a50132325333573466e3c00801052889998030030008021aba2002375c6ae8400400888c8ccc00400520000032223333573466e1c0100095d0919980200219b8000348008d5d100080091aab9e37540022930b1bae0014c11e581ca08ee6a678a207de52061c4ef98209525c9a8af8fe47bbadda50cb8500010481d8799f581c5ea504edcfdf2f4ae7f1855b789ab4c0d9cb0f75cb941556d78cdfe343414441434144411a005b8d80ff0581840000d8799fff821a000186a01a01312d00f5a11902a2a1636d736782724d7574616e74204c61627320526166666c6578314275792035207469636b65747320666f7220526166666c6520363436323562383565363664363763653135626162663430',
};
export const expectedDifferentMetadataTxResponse = `{"id":"dd8fc82e9ca2d38cffdfb2ab9ec51ea8158f7ade67b95c2dece63de3b8f836a7","inputs":[{"txId":"6173600230d8e09bd61520c4f451ab9f1efca9e3a082a149bcc6914896997695","index":1},{"txId":"86bd079733207c6b4ba764fb5408fa59b74ef1733e8b3f9f6e8ef41ac3c048f9","index":0}],"outputs":[{"address":"addr1qxmpg2p8xfrk0qyz5ksjqtk93u04vd6alds3w6dhrj4vcsvzc3ed2wp3m7m7m7pjt8x5qlh8v9we55n3kg4duw7kcwxsxt52zf","value":319849555,"assets":[]},{"address":"addr1w8cvzcnclvkua25vx26j72pddatuedsxspm62mr63urs0fctuuzfv","value":962000000,"assets":[{"policyId":"40fa2aa67258b4ce7b5782f74831d46a84c59a0ff0c28262fab21728","assetName":"436c61794e6174696f6e39353837","quantity":1}]}],"fee":227681,"metadata":{"674":{"msg":["Mutant Labs Raffle","Buy 5 tickets for Raffle 64625b85e66d67ce15babf40"]}}}`;

export const txBytes =
  '84a400818258205c4f4494618db7e9a3122eb94bb8dc4a8596dbf9d282062ca64475e53c2d9371010182825839010365ded8ab99a8862e248ee53f25e6ea3d6901a1e1aaf42665da948f53812d75db5cd24f281d1bf324237d7d12c69d42d13cafd0620b3013821a002dc6c0a1581ca0028f350aaabe0545fdcb56b039bfb08e4bb4d8c4d7c3c7d481c235a145484f534b591a0c26467882581d6153ae5704f4e854362cc8b08b5e0229cfc998b237769eba56157a106c821a3d4aa5f2a3581ca0028f350aaabe0545fdcb56b039bfb08e4bb4d8c4d7c3c7d481c235a145484f534b591a7b2dbe5c581cbb2250e4c589539fd141fbbd2c322d380f1ce2aaef812cd87110d61ba14e527374434f4d45545654657374321b00000004e38cc250581cd2f6eb37450a3d568de93d623e69bd0ba1238daacc883d75736abd23a14c5273744572675654657374321b0de0b6b06dd70ec0021a00061a80031a056de76fa10081825820c34e5645d83d7c0319d1e73bb8a272592b16bb9b6f450811e52f9bb6f943dec858405aafe73b3a198272c2056836c9268ce145e1b878013cdca62a58ce7ce29dce60fa753b00103705fea1c79af5be2174a7839d137fc7f4ad0ea231208b874dfd04f5f6';

export const addressUtxoSet = [
  {
    value: '1344798',
    tx_hash: '4eb16141fb4f2ca1cabc0dfb16491e54a1b4464b75591ccc3942eb4c6f4273fb',
    tx_index: 0,
    asset_list: [
      {
        decimals: 0,
        quantity: '64576047',
        policy_id: '0dad352d8f0d5ce3f5be8b025d6a16141ecceab5a921871792d91f47',
        asset_name: '5273455247',
        fingerprint: 'asset1p40r0eun2alszlxhj7k4uylya4cj54lxkjjmsm',
      },
    ],
    block_time: 1678937785,
    datum_hash: null,
    block_height: 8522948,
    inline_datum: null,
    reference_script: null,
  },
  {
    value: '1344798',
    tx_hash: 'dbd93ef240f7546ce6b8619b6bea4486252bdeaae89d4ee9f74a6fa363d4eb22',
    tx_index: 0,
    asset_list: [
      {
        decimals: 0,
        quantity: '57617503',
        policy_id: '0dad352d8f0d5ce3f5be8b025d6a16141ecceab5a921871792d91f47',
        asset_name: '5273455247',
        fingerprint: 'asset1p40r0eun2alszlxhj7k4uylya4cj54lxkjjmsm',
      },
    ],
    block_time: 1678937836,
    datum_hash: null,
    block_height: 8522950,
    inline_datum: null,
    reference_script: null,
  },
  {
    value: '1260649',
    tx_hash: '454426c78db02b32a02274d926850fad261bb08b3dbfac962ba38c5118856dc6',
    tx_index: 0,
    asset_list: [],
    block_time: 1678937862,
    datum_hash: null,
    block_height: 8522952,
    inline_datum: null,
    reference_script: null,
  },
];
export const expectedAdressUtxoSet = [
  '{"txId":"4eb16141fb4f2ca1cabc0dfb16491e54a1b4464b75591ccc3942eb4c6f4273fb","index":0,"value":1344798,"assets":[{"policyId":"0dad352d8f0d5ce3f5be8b025d6a16141ecceab5a921871792d91f47","assetName":"5273455247","quantity":64576047}]}',
  '{"txId":"dbd93ef240f7546ce6b8619b6bea4486252bdeaae89d4ee9f74a6fa363d4eb22","index":0,"value":1344798,"assets":[{"policyId":"0dad352d8f0d5ce3f5be8b025d6a16141ecceab5a921871792d91f47","assetName":"5273455247","quantity":57617503}]}',
  '{"txId":"454426c78db02b32a02274d926850fad261bb08b3dbfac962ba38c5118856dc6","index":0,"value":1260649,"assets":[]}',
];

export const credentialUtxos = [
  {
    tx_hash: '4eb16141fb4f2ca1cabc0dfb16491e54a1b4464b75591ccc3942eb4c6f4273fb',
    tx_index: 0,
    value: '1344798',
  },
  {
    tx_hash: 'dbd93ef240f7546ce6b8619b6bea4486252bdeaae89d4ee9f74a6fa363d4eb22',
    tx_index: 0,
    value: '1344798',
  },
  {
    tx_hash: '454426c78db02b32a02274d926850fad261bb08b3dbfac962ba38c5118856dc6',
    tx_index: 0,
    value: '1260649',
  },
] as UtxoInfos;
export const expectedUtxo: CardanoUtxo = {
  txId: '98884bf40d8ebbd89ad78c6deaa31f0cc47938d941bfc0452bbc9a13aeb37cd3',
  index: 0,
  value: 1286857n,
  assets: [],
};
export const unspentUtxoTxKoiosResponse: TxCborItem = {
  tx_hash: '454426c78db02b32a02274d926850fad261bb08b3dbfac962ba38c5118856dc6',
  block_hash:
    '24cb3a5cf2faaba1728eeced3f235c96e27877e62fd32a43f5680ea2ab649ffe',
  block_height: 8522952,
  epoch_no: 399,
  absolute_slot: 87371571,
  tx_timestamp: 1678937862,
  cbor: '84a4008182582026bd963e4d175d96b07a0e3a635449bce168b9de88a6afac7f44184f0683635a01018282581d61cc1e2d66086462a554a4c0813ccc2e01c06eb36e76dd50a268ab314f1a00133c69825839017de25615347dc1570e77113680382c43b8412afb5f44d268feec98da46de1ba51442f8b49a7ce15256e5c0084d68a4656134696c62148540821a0032c9c0a0021a0004129d075820d2e46da0dc415c69ae6726bb9df06258908cc2aac67224e91c8901d26685733ba1008282582086882cef4f447d01b8287b1c9dfb4496c87e07c1a27229513a4dd605de9cf89f584078b5ce6a6a3572df005473e244975b506602723b680c90bfdb0b17d8b60064f6c347f9578a9ee07da4751a8d0d1bcc4c6664b7f561fb93e9a6e1522ebaef750d825820cee6610db2ae16c1bfc793084d1125104de75164bf188604b8e1125ed4a9401a58408091b62e6ec4df60f7736ed8fe2641722e2886ad9f2f0703edeb1b6273a6e101ad13830996905877a3fdcdb66744db8117773948b036dcae5308794d72392307f5a100a562746f646572676f69627269646765466565663330303030306a6e6574776f726b4665656635303030303069746f4164647265737378333967376372356e3545487077416a6f595a70706a74575a663464754c434d46467a6f50736756364c744b447a5242634a3248636b66726f6d4164647265737382784061646472317139373779347334783337757a3463777775676e647170633933706d737366326c64303566356e676c6d6b66336b6a786d63643632397a7a6c7a36782766356c3870326674777473716766343532676574707833356b6363733573347171666576327067',
};
export const unspentBoxId =
  '454426c78db02b32a02274d926850fad261bb08b3dbfac962ba38c5118856dc6.0';
export const boxId =
  '98884bf40d8ebbd89ad78c6deaa31f0cc47938d941bfc0452bbc9a13aeb37cd3.0';

export const epochParams = {
  epoch_no: 447,
  min_fee_a: 44,
  min_fee_b: 155381,
  max_block_size: 90112,
  max_tx_size: 16384,
  max_bh_size: 1100,
  key_deposit: '2000000',
  pool_deposit: '500000000',
  max_epoch: 18,
  optimal_pool_count: 500,
  influence: 0.3,
  monetary_expand_rate: 0.003,
  treasury_growth_rate: 0.2,
  decentralisation: 0,
  extra_entropy: null,
  protocol_major: 8,
  protocol_minor: 0,
  min_utxo_value: '0',
  min_pool_cost: '170000000',
  nonce: '3cf0a6c3179f521101ceef355b1b3e3d782846f0b9161dd7095e096bbb6536bf',
  block_hash:
    '376ca52b4759cb2a7aa255cbfc93b615c40366d7d043f168796eaa054f622dd9',
  cost_models: {},
  price_mem: 0.0577,
  price_step: 0.0000721,
  max_tx_ex_mem: 14000000,
  max_tx_ex_steps: 10000000000,
  max_block_ex_mem: 62000000,
  max_block_ex_steps: 20000000000,
  max_val_size: 5000,
  collateral_percent: 150,
  max_collateral_inputs: 3,
  coins_per_utxo_size: '4310',
};
export const expectedRequiredParams = {
  minFeeA: 44,
  minFeeB: 155381,
  poolDeposit: '500000000',
  keyDeposit: '2000000',
  maxValueSize: 5000,
  maxTxSize: 16384,
  coinsPerUtxoSize: '4310',
};

export const assetId =
  '04b95368393c821f180deee8229fbd941baaf9bd748ebcdbf7adbb14.7273455247';
export const assetInfo = {
  policy_id: '04b95368393c821f180deee8229fbd941baaf9bd748ebcdbf7adbb14',
  asset_name: '7273455247',
  asset_name_ascii: 'rsERG',
  fingerprint: 'asset1a7ej28cdf078tndzcvswm5whk2jrpd0z98vlg4',
  minting_tx_hash:
    '67abf7316b303aeb3e643eaa560dc613e14e73f2e944da2295ef0245983887fa',
  total_supply: '97739924500000000',
  mint_cnt: 1,
  burn_cnt: 0,
  creation_time: 1701302400,
  minting_tx_metadata: null,
  token_registry_metadata: {
    url: 'url',
    logo: 'logo',
    name: 'rsERG',
    ticker: 'reERG',
    decimals: 9,
    description: 'description',
  },
  cip68_metadata: null,
};
export const expectedTokenDetail = {
  tokenId: assetId,
  name: 'rsERG',
  decimals: 9,
};
