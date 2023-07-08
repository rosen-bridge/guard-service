import {
  Address,
  BlockHeaders,
  BoxSelection,
  Contract,
  ErgoBox,
  ErgoBoxAssetsDataList,
  ErgoBoxCandidates,
  ErgoBoxCandidate,
  ErgoBoxes,
  ErgoStateContext,
  PreHeader,
  SecretKey,
  SecretKeys,
  Tokens,
  TransactionHintsBag,
  TxId,
  Wallet,
  ErgoBoxCandidateBuilder,
  TxBuilder,
  TokenAmount,
  TokenId,
  BoxValue,
  I64,
} from 'ergo-lib-wasm-nodejs';
import TestUtils from '../../testUtils/TestUtils';
import { Asset } from '@rosen-bridge/scanner/dist/scanner/ergo/network/types';

const mockedBlockHeaderJson = Array(10).fill({
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
  parentId: '0000000000000000000000000000000000000000000000000000000000000000',
});

const mockedBlockHeaders = BlockHeaders.from_json(mockedBlockHeaderJson);

export const mockedErgoStateContext: ErgoStateContext = new ErgoStateContext(
  PreHeader.from_block_header(mockedBlockHeaders.get(0)),
  mockedBlockHeaders
);

const mockErgoBoxCandidate = (
  value: bigint,
  assets: Asset[],
  boxContract: Contract
): ErgoBoxCandidate => {
  const inBox = new ErgoBoxCandidateBuilder(
    BoxValue.from_i64(I64.from_str(value.toString())),
    boxContract,
    100000
  );
  assets.forEach((asset) =>
    inBox.add_token(
      TokenId.from_str(asset.tokenId),
      TokenAmount.from_i64(I64.from_str(asset.amount.toString()))
    )
  );
  return inBox.build();
};

export const mockPartialSignedTransaction = () => {
  const firstSecretKeyString =
    '5bc1d17d0612e696a9138ab8e85ca2a02d0171440ec128a9ad557c28bd5ea046';
  const secondSecretKeyString =
    '168e8fee8ac6965832d6c1c17cdf60c1b582b09f293d8bd88231e32740e3b24f';
  const firstSecrets = new SecretKeys();
  const firstSecretKey = SecretKey.dlog_from_bytes(
    Buffer.from(firstSecretKeyString, 'hex')
  );
  firstSecrets.add(firstSecretKey);
  const firstWallet = Wallet.from_secrets(firstSecrets);

  const secondSecrets = new SecretKeys();
  const secondSecretKey = SecretKey.dlog_from_bytes(
    Buffer.from(secondSecretKeyString, 'hex')
  );
  secondSecrets.add(secondSecretKey);
  const secondWallet = Wallet.from_secrets(secondSecrets);

  // MultiSig address of two publicKeys
  const addressString =
    '3sSMhchmFojcrqmeJXWfdr4CvPU8hz5BqyNBh3FBSLVdzNJNWe4oEtkfLyfEz3jNYUjwyRvBtrXBjq3LsqusGwkjunzRYexxDbUou5myRDjabniLd';
  const address = Address.from_base58(addressString);

  const fakeInBox = new ErgoBox(
    BoxValue.from_i64(I64.from_str('2200000')),
    100000,
    Contract.new(address.to_ergo_tree()),
    TxId.from_str(TestUtils.generateRandomId()),
    0,
    new Tokens()
  );

  const inBoxes = new BoxSelection(
    new ErgoBoxes(fakeInBox),
    new ErgoBoxAssetsDataList()
  );
  const tx = TxBuilder.new(
    inBoxes,
    new ErgoBoxCandidates(
      mockErgoBoxCandidate(1100000n, [], Contract.new(address.to_ergo_tree()))
    ),
    100010,
    BoxValue.from_i64(I64.from_str('1100000')),
    address
  ).build();

  const firstCommitment = firstWallet.generate_commitments(
    mockedErgoStateContext,
    tx,
    new ErgoBoxes(fakeInBox),
    ErgoBoxes.empty()
  );
  const secondCommitment = secondWallet.generate_commitments(
    mockedErgoStateContext,
    tx,
    new ErgoBoxes(fakeInBox),
    ErgoBoxes.empty()
  );
  const hintsBag = TransactionHintsBag.empty();
  hintsBag.add_hints_for_input(0, secondCommitment.all_hints_for_input(0));
  hintsBag.add_hints_for_input(0, firstCommitment.all_hints_for_input(0));
  const fakeTx = firstWallet.sign_transaction_multi(
    mockedErgoStateContext,
    tx,
    new ErgoBoxes(fakeInBox),
    ErgoBoxes.empty(),
    hintsBag
  );

  return {
    transaction: fakeTx,
    inputBoxes: [fakeInBox],
    commitments: [firstCommitment, secondCommitment],
  };
};
