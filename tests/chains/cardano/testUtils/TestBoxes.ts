import {
  EventTrigger,
  PaymentTransaction,
  TransactionTypes,
} from '../../../../src/models/Models';
import TestUtils from '../../../testUtils/TestUtils';
import {
  AddressInfo,
  AddressAssets,
  AddressUtxos,
  TxUtxos,
  Utxo,
} from '../../../../src/chains/cardano/models/Interfaces';
import {
  Address,
  AssetName,
  Assets,
  AuxiliaryData,
  BigNum,
  GeneralTransactionMetadata,
  hash_transaction,
  MetadataMap,
  MultiAsset,
  ScriptHash,
  Transaction,
  TransactionBuilder,
  TransactionMetadatum,
  TransactionOutput,
  TransactionWitnessSet,
  Value,
} from '@emurgo/cardano-serialization-lib-nodejs';
import CardanoConfigs from '../../../../src/chains/cardano/helpers/CardanoConfigs';
import CardanoUtils from '../../../../src/chains/cardano/helpers/CardanoUtils';
import CardanoTransaction from '../../../../src/chains/cardano/models/CardanoTransaction';
import TestData from './TestData';
import ChainsConstants from '../../../../src/chains/ChainsConstants';
import Utils from '../../../../src/helpers/Utils';
import TestConfigs from '../../../testUtils/TestConfigs';
import { mock } from 'ts-mockito';

// TODO: split this file variables and functions into multiple files (#94)
class TestBoxes {
  static testBankAddress = CardanoConfigs.bankAddress;

  /**
   * returns string representation for arbitrary amount of ADA in lovelace unit
   */
  static adaToLovelaceString = (ada: number): string =>
    (ada * 1000000).toString();

  /**
   * generates a mocked event trigger for ADA payment in cardano chain
   */
  static mockADAPaymentEventTrigger = (): EventTrigger => {
    return new EventTrigger(
      ChainsConstants.ergo,
      ChainsConstants.cardano,
      '',
      'addr_test1qqn3eyyydsztynkk2f3x4hsfz46klqf6xncp2em92mgt3qtvvz7nw9gmznn65g4ksrrfvyzhz52knc3mqxdyya47gz2qppk5jd',
      '51300000',
      '1000000',
      '300000',
      '064c58ea394d41fada074a3c560a132467adf4ca1512c409c014c625ca285e9c',
      'lovelace',
      TestUtils.generateRandomId(),
      '',
      TestConfigs.ergo.blockchainHeight - 20,
      TestConfigs.ergo.blockchainHeight - 40,
      []
    );
  };

  /**
   * generates a mocked event trigger for asset payment in cardano chain
   */
  static mockAssetPaymentEventTrigger = (): EventTrigger => {
    return new EventTrigger(
      ChainsConstants.ergo,
      ChainsConstants.cardano,
      '',
      'addr_test1qqn3eyyydsztynkk2f3x4hsfz46klqf6xncp2em92mgt3qtvvz7nw9gmznn65g4ksrrfvyzhz52knc3mqxdyya47gz2qppk5jd',
      '80',
      '10',
      '5',
      '0034c44f0c7a38f833190d44125ff9b3a0dd9dbb89138160182a930bc521db95',
      'asset1nl0puwxmhas8fawxp8nx4e2q3wekg969n2auw3',
      TestUtils.generateRandomId(),
      '',
      TestConfigs.ergo.blockchainHeight - 20,
      TestConfigs.ergo.blockchainHeight - 40,
      []
    );
  };

  /**
   * generates a mocked event trigger for event verification in cardano chain
   */
  static mockValidEventTrigger = (): EventTrigger => {
    return new EventTrigger(
      ChainsConstants.cardano,
      ChainsConstants.ergo,
      'addr_test1qzf9uxs6xgprx4zt20qtsasxut8uw6quv34xlkmd26yuk5xe70s0yf5c3sefnrft6gdajkpz29t8lsn0kcr5xqsf34qqxd6n4f',
      'ergoAddress',
      '13060',
      '250',
      '10000',
      'asset1nl0puwxmhas8fawxp8nx4e2q3wekg969n2auw3',
      '0034c44f0c7a38f833190d44125ff9b3a0dd9dbb89138160182a930bc521db95',
      '928052b80bfc23801da525a6bf8f805da36f22fa0fd5fec2198b0746eb82b72b',
      'f75fea40852ed7d7f539d008e45255725daef8553ae7162750836f279570813a',
      TestConfigs.ergo.blockchainHeight - 20,
      TestConfigs.cardano.blockchainHeight - 100,
      []
    );
  };

  /**
   * generates a mocked event trigger for event verification in cardano chain
   */
  static mockInValidMetadataEventTrigger = (): EventTrigger => {
    return new EventTrigger(
      ChainsConstants.cardano,
      ChainsConstants.ergo,
      'addr_test1qzf9uxs6xgprx4zt20qtsasxut8uw6quv34xlkmd26yuk5xe70s0yf5c3sefnrft6gdajkpz29t8lsn0kcr5xqsf34qqxd6n4f',
      'ergoAddress',
      '13060',
      '250',
      '10000',
      'asset1nl0puwxmhas8fawxp8nx4e2q3wekg969n2auw3',
      '0034c44f0c7a38f833190d44125ff9b3a0dd9dbb89138160182a930bc521db95',
      '028052b80bfc23801da525a6bf8f805da36f22fa0fd5fec2198b0746eb82b72b',
      'f75fea40852ed7d7f539d008e45255725daef8553ae7162750836f279570813a',
      TestConfigs.ergo.blockchainHeight - 20,
      TestConfigs.cardano.blockchainHeight - 100,
      []
    );
  };

  /**
   * generates a mocked event trigger for event verification in cardano chain
   */
  static mockInValidTokenEventTrigger = (): EventTrigger => {
    return new EventTrigger(
      ChainsConstants.cardano,
      ChainsConstants.ergo,
      'addr_test1qzf9uxs6xgprx4zt20qtsasxut8uw6quv34xlkmd26yuk5xe70s0yf5c3sefnrft6gdajkpz29t8lsn0kcr5xqsf34qqxd6n4f',
      'ergoAddress',
      '13060',
      '250',
      '10000',
      'asset1nl0puwxmhas8fawxp8nx4e2q3wekg969n2auw3',
      '0034c44f0c7a38f833190d44125ff9b3a0dd9dbb89138160182a930bc521db95',
      '128052b80bfc23801da525a6bf8f805da36f22fa0fd5fec2198b0746eb82b72b',
      'f75fea40852ed7d7f539d008e45255725daef8553ae7162750836f279570813a',
      TestConfigs.ergo.blockchainHeight - 20,
      TestConfigs.cardano.blockchainHeight - 100,
      []
    );
  };

  /**
   * generates a mocked event trigger for event verification in cardano chain locking Ada
   */
  static mockValidAdaEventTrigger = (): EventTrigger => {
    return new EventTrigger(
      ChainsConstants.cardano,
      ChainsConstants.ergo,
      'addr_test1qzf9uxs6xgprx4zt20qtsasxut8uw6quv34xlkmd26yuk5xe70s0yf5c3sefnrft6gdajkpz29t8lsn0kcr5xqsf34qqxd6n4f',
      'ergoAddress',
      '49796752',
      '250',
      '10000',
      'lovelace',
      '064c58ea394d41fada074a3c560a132467adf4ca1512c409c014c625ca285e9c',
      '00ee077854471a04fbef18a5a971b50fb39f52fc6f6b3b8d0682ce2c48f6ebef',
      'f75fea40852ed7d7f539d008e45255725daef8553ae7162750836f279570813a',
      TestConfigs.ergo.blockchainHeight - 20,
      TestConfigs.cardano.blockchainHeight - 100,
      []
    );
  };

  /**
   * generates a mocked invalid event trigger for event verification in cardano chain with invalid toChain
   */
  static mockInvalidToChainEventTrigger = (): EventTrigger => {
    return new EventTrigger(
      ChainsConstants.cardano,
      'incorrect_ergo',
      'addr_test1qzf9uxs6xgprx4zt20qtsasxut8uw6quv34xlkmd26yuk5xe70s0yf5c3sefnrft6gdajkpz29t8lsn0kcr5xqsf34qqxd6n4f',
      'ergoAddress',
      '13060',
      '250',
      '10000',
      'asset1nl0puwxmhas8fawxp8nx4e2q3wekg969n2auw3',
      '0034c44f0c7a38f833190d44125ff9b3a0dd9dbb89138160182a930bc521db95',
      '928052b80bfc23801da525a6bf8f805da36f22fa0fd5fec2198b0746eb82b72b',
      'f75fea40852ed7d7f539d008e45255725daef8553ae7162750836f279570813a',
      TestConfigs.ergo.blockchainHeight - 20,
      TestConfigs.cardano.blockchainHeight - 100,
      []
    );
  };

  /**
   * generates a mocked invalid event trigger for event verification in cardano chain with invalid fromAddress
   */
  static mockInvalidFromAddressEventTrigger = (): EventTrigger => {
    return new EventTrigger(
      ChainsConstants.cardano,
      ChainsConstants.ergo,
      'addr_test1vze7yqqlg8cjlyhz7jzvsg0f3fhxpuu6m3llxrajfzqecggw704re',
      'ergoAddress',
      '13060',
      '250',
      '10000',
      'asset1nl0puwxmhas8fawxp8nx4e2q3wekg969n2auw3',
      '0034c44f0c7a38f833190d44125ff9b3a0dd9dbb89138160182a930bc521db95',
      '928052b80bfc23801da525a6bf8f805da36f22fa0fd5fec2198b0746eb82b72b',
      'f75fea40852ed7d7f539d008e45255725daef8553ae7162750836f279570813a',
      TestConfigs.ergo.blockchainHeight - 20,
      TestConfigs.cardano.blockchainHeight - 100,
      []
    );
  };

  /**
   * generates a mocked invalid event trigger for event verification in cardano chain with invalid toAddress
   */
  static mockInvalidToAddressEventTrigger = (): EventTrigger => {
    return new EventTrigger(
      ChainsConstants.cardano,
      ChainsConstants.ergo,
      'addr_test1qzf9uxs6xgprx4zt20qtsasxut8uw6quv34xlkmd26yuk5xe70s0yf5c3sefnrft6gdajkpz29t8lsn0kcr5xqsf34qqxd6n4f',
      'ergoAddressFake',
      '13060',
      '250',
      '10000',
      'asset1nl0puwxmhas8fawxp8nx4e2q3wekg969n2auw3',
      '0034c44f0c7a38f833190d44125ff9b3a0dd9dbb89138160182a930bc521db95',
      '928052b80bfc23801da525a6bf8f805da36f22fa0fd5fec2198b0746eb82b72b',
      'f75fea40852ed7d7f539d008e45255725daef8553ae7162750836f279570813a',
      TestConfigs.ergo.blockchainHeight - 20,
      TestConfigs.cardano.blockchainHeight - 100,
      []
    );
  };

  /**
   * generates a mocked invalid event trigger for event verification in cardano chain with invalid amount
   */
  static mockInvalidAmountEventTrigger = (): EventTrigger => {
    return new EventTrigger(
      ChainsConstants.cardano,
      ChainsConstants.ergo,
      'addr_test1qzf9uxs6xgprx4zt20qtsasxut8uw6quv34xlkmd26yuk5xe70s0yf5c3sefnrft6gdajkpz29t8lsn0kcr5xqsf34qqxd6n4f',
      'ergoAddress',
      '13',
      '250',
      '10000',
      'asset1nl0puwxmhas8fawxp8nx4e2q3wekg969n2auw3',
      '0034c44f0c7a38f833190d44125ff9b3a0dd9dbb89138160182a930bc521db95',
      '928052b80bfc23801da525a6bf8f805da36f22fa0fd5fec2198b0746eb82b72b',
      'f75fea40852ed7d7f539d008e45255725daef8553ae7162750836f279570813a',
      TestConfigs.ergo.blockchainHeight - 20,
      TestConfigs.cardano.blockchainHeight - 100,
      []
    );
  };

  /**
   * generates a mocked invalid event trigger for event verification in cardano chain with invalid bridge fee
   */
  static mockInvalidBridgeFeeEventTrigger = (): EventTrigger => {
    return new EventTrigger(
      ChainsConstants.cardano,
      ChainsConstants.ergo,
      'addr_test1qzf9uxs6xgprx4zt20qtsasxut8uw6quv34xlkmd26yuk5xe70s0yf5c3sefnrft6gdajkpz29t8lsn0kcr5xqsf34qqxd6n4f',
      'ergoAddress',
      '13060',
      '25',
      '10000',
      'asset1nl0puwxmhas8fawxp8nx4e2q3wekg969n2auw3',
      '0034c44f0c7a38f833190d44125ff9b3a0dd9dbb89138160182a930bc521db95',
      '928052b80bfc23801da525a6bf8f805da36f22fa0fd5fec2198b0746eb82b72b',
      'f75fea40852ed7d7f539d008e45255725daef8553ae7162750836f279570813a',
      TestConfigs.ergo.blockchainHeight - 20,
      TestConfigs.cardano.blockchainHeight - 100,
      []
    );
  };

  /**
   * generates a mocked invalid event trigger for event verification in cardano chain with invalid network fee
   */
  static mockInvalidNetworkFeeEventTrigger = (): EventTrigger => {
    return new EventTrigger(
      ChainsConstants.cardano,
      ChainsConstants.ergo,
      'addr_test1qzf9uxs6xgprx4zt20qtsasxut8uw6quv34xlkmd26yuk5xe70s0yf5c3sefnrft6gdajkpz29t8lsn0kcr5xqsf34qqxd6n4f',
      'ergoAddress',
      '13060',
      '250',
      '1000',
      'asset1nl0puwxmhas8fawxp8nx4e2q3wekg969n2auw3',
      '0034c44f0c7a38f833190d44125ff9b3a0dd9dbb89138160182a930bc521db95',
      '928052b80bfc23801da525a6bf8f805da36f22fa0fd5fec2198b0746eb82b72b',
      'f75fea40852ed7d7f539d008e45255725daef8553ae7162750836f279570813a',
      TestConfigs.ergo.blockchainHeight - 20,
      TestConfigs.cardano.blockchainHeight - 100,
      []
    );
  };

  /**
   * generates a mocked invalid event trigger for event verification in cardano chain with invalid source token
   */
  static mockInvalidSourceTokenEventTrigger = (): EventTrigger => {
    return new EventTrigger(
      ChainsConstants.cardano,
      ChainsConstants.ergo,
      'addr_test1qzf9uxs6xgprx4zt20qtsasxut8uw6quv34xlkmd26yuk5xe70s0yf5c3sefnrft6gdajkpz29t8lsn0kcr5xqsf34qqxd6n4f',
      'ergoAddress',
      '13060',
      '250',
      '10000',
      'asset1nl0puwxm00s8fawxp8nx4e2q3wekg969n2au11',
      '0034c44f0c7a38f833190d44125ff9b3a0dd9dbb89138160182a930bc521db95',
      '928052b80bfc23801da525a6bf8f805da36f22fa0fd5fec2198b0746eb82b72b',
      'f75fea40852ed7d7f539d008e45255725daef8553ae7162750836f279570813a',
      TestConfigs.ergo.blockchainHeight - 20,
      TestConfigs.cardano.blockchainHeight - 100,
      []
    );
  };

  /**
   * generates a mocked invalid event trigger for event verification in cardano chain with invalid target token
   */
  static mockInvalidTargetTokenEventTrigger = (): EventTrigger => {
    return new EventTrigger(
      ChainsConstants.cardano,
      ChainsConstants.ergo,
      'addr_test1qzf9uxs6xgprx4zt20qtsasxut8uw6quv34xlkmd26yuk5xe70s0yf5c3sefnrft6gdajkpz29t8lsn0kcr5xqsf34qqxd6n4f',
      'ergoAddress',
      '13060',
      '250',
      '10000',
      'asset1nl0puwxmhas8fawxp8nx4e2q3wekg969n2auw3',
      '1034c44f0c7a38f833190d44125ff9b3a0dd9dbb89138160182a930bc521db95',
      '928052b80bfc23801da525a6bf8f805da36f22fa0fd5fec2198b0746eb82b72b',
      'f75fea40852ed7d7f539d008e45255725daef8553ae7162750836f279570813a',
      TestConfigs.ergo.blockchainHeight - 20,
      TestConfigs.cardano.blockchainHeight - 100,
      []
    );
  };

  /**
   * generates a mocked invalid event trigger for event verification in cardano chain with invalid source tx
   */
  static mockInvalidSourceTxEventTrigger = (): EventTrigger => {
    return new EventTrigger(
      ChainsConstants.cardano,
      ChainsConstants.ergo,
      'addr_test1qzf9uxs6xgprx4zt20qtsasxut8uw6quv34xlkmd26yuk5xe70s0yf5c3sefnrft6gdajkpz29t8lsn0kcr5xqsf34qqxd6n4f',
      'ergoAddress',
      '13060',
      '250',
      '10000',
      'asset1nl0puwxmhas8fawxp8nx4e2q3wekg969n2auw3',
      '0034c44f0c7a38f833190d44125ff9b3a0dd9dbb89138160182a930bc521db95',
      '0f32ad374daefdce563e3391effc4fc42eb0e74bbec8afe16a46eeea69e3b2aa',
      'f75fea40852ed7d7f539d008e45255725daef8553ae7162750836f279570813a',
      TestConfigs.ergo.blockchainHeight - 20,
      TestConfigs.cardano.blockchainHeight - 100,
      []
    );
  };

  /**
   * generates a mocked invalid event trigger for event verification in cardano chain with invalid block
   */
  static mockInvalidBlockEventTrigger = (): EventTrigger => {
    return new EventTrigger(
      ChainsConstants.cardano,
      ChainsConstants.ergo,
      'addr_test1qzf9uxs6xgprx4zt20qtsasxut8uw6quv34xlkmd26yuk5xe70s0yf5c3sefnrft6gdajkpz29t8lsn0kcr5xqsf34qqxd6n4f',
      'ergoAddress',
      '13060',
      '250',
      '10000',
      'asset1nl0puwxmhas8fawxp8nx4e2q3wekg969n2auw3',
      '0034c44f0c7a38f833190d44125ff9b3a0dd9dbb89138160182a930bc521db95',
      '928052b80bfc23801da525a6bf8f805da36f22fa0fd5fec2198b0746eb82b72b',
      '03395496d590ec6db0f2fd13a7bcf91e82a9f230ef677f6216ea8c9f57df6ab3',
      TestConfigs.ergo.blockchainHeight - 20,
      TestConfigs.cardano.blockchainHeight - 100,
      []
    );
  };

  /**
   * generates 8 Utxo for cardano bank address
   */
  static mockBankBoxes = (): Utxo[] => {
    const box1: Utxo = {
      payment_addr: { bech32: '' },
      tx_hash: TestUtils.generateRandomId(),
      tx_index: 0,
      value: this.adaToLovelaceString(30),
      asset_list: [
        {
          policy_id: '7eae28af2208be856f7a119668ae52a49b73725e326dc16579dcc373',
          asset_name: '',
          quantity: '100',
          fingerprint: 'asset1nl000004e2q4444444444auw30000000000000',
        },
        {
          policy_id: 'ace7bcc2ce705679149746620de3a84660ce57573df54b5a096e39a2',
          asset_name: '7369676d61',
          quantity: '50',
          fingerprint: 'asset1nl0puwxmhas8fawxp8nx4e2q3wekg969n2auw3',
        },
      ],
    };
    const box2: Utxo = {
      payment_addr: { bech32: '' },
      tx_hash: TestUtils.generateRandomId(),
      tx_index: 0,
      value: this.adaToLovelaceString(100),
      asset_list: [
        {
          policy_id: 'ace7bcc2ce705679149746620de3a84660ce57573df54b5a096e39a2',
          asset_name: '7369676d61',
          quantity: '45',
          fingerprint: 'asset1nl0puwxmhas8fawxp8nx4e2q3wekg969n2auw3',
        },
      ],
    };
    const box3: Utxo = {
      payment_addr: { bech32: '' },
      tx_hash: TestUtils.generateRandomId(),
      tx_index: 2,
      value: this.adaToLovelaceString(10),
      asset_list: [],
    };

    const box4: Utxo = {
      payment_addr: { bech32: '' },
      tx_hash: TestUtils.generateRandomId(),
      tx_index: 5,
      value: this.adaToLovelaceString(5),
      asset_list: [],
    };

    const box5: Utxo = {
      payment_addr: { bech32: '' },
      tx_hash: TestUtils.generateRandomId(),
      tx_index: 2,
      value: this.adaToLovelaceString(1),
      asset_list: [],
    };

    const box6: Utxo = {
      payment_addr: { bech32: '' },
      tx_hash: TestUtils.generateRandomId(),
      tx_index: 0,
      value: this.adaToLovelaceString(101),
      asset_list: [
        {
          policy_id: 'ace7bcc2ce705679149746620de3a84660ce57573df54b5a096e39a2',
          asset_name: '7369676d61',
          quantity: '55',
          fingerprint: 'asset1nl0puwxmhas8fawxp8nx4e2q3wekg969n2auw3',
        },
      ],
    };

    const box7: Utxo = {
      payment_addr: { bech32: '' },
      tx_hash: TestUtils.generateRandomId(),
      tx_index: 0,
      value: '1000',
      asset_list: [
        {
          policy_id: '22c3b86a5b88a78b5de52f4aed2831d1483b3b7681f1ee2569538130',
          asset_name: '1111111111',
          quantity: '55',
          fingerprint: 'asset1nl000000000000000000000000000000000000',
        },
      ],
    };

    const box8: Utxo = {
      payment_addr: { bech32: '' },
      tx_hash: TestUtils.generateRandomId(),
      tx_index: 2,
      value: '1000',
      asset_list: [],
    };

    const box9: Utxo = {
      payment_addr: { bech32: '' },
      tx_hash: TestUtils.generateRandomId(),
      tx_index: 0,
      value: '10000',
      asset_list: [
        {
          policy_id: '22c3b86a5b88a78b5de52f4aed2831d1483b3b7681f1ee2569538130',
          asset_name: '1111111111',
          quantity: '11',
          fingerprint: 'asset1nl000000000000000000000000000000000000',
        },
      ],
    };

    return [box1, box2, box3, box4, box5, box6, box7, box8, box9];
  };

  /**
   * generates a mocked payment transaction with given outBoxes
   * @param outBoxes output Utxos in the transaction
   * @param eventId the event trigger id
   */
  static mockPaymentTransaction = (
    outBoxes: TransactionOutput[],
    eventId: string
  ): PaymentTransaction => {
    const txBuilder = TransactionBuilder.new(CardanoConfigs.txBuilderConfig);
    outBoxes.forEach((box) => txBuilder.add_output(box));

    // set transaction TTL and Fee
    txBuilder.set_ttl(CardanoConfigs.txTtl);
    txBuilder.set_fee(CardanoConfigs.txFee);

    // create the transaction
    const txBody = txBuilder.build();
    const tx = Transaction.new(
      txBody,
      TransactionWitnessSet.new(),
      undefined // transaction metadata
    );

    // create PaymentTransaction object
    const txId = Utils.Uint8ArrayToHexString(
      hash_transaction(tx.body()).to_bytes()
    );
    const txBytes = tx.to_bytes();
    return new CardanoTransaction(
      txId,
      eventId,
      txBytes,
      TransactionTypes.payment
    );
  };

  /**
   * generates a mocked payment transaction with given outBoxes and sets arbitrary metadata
   * @param outBoxes output Utxos in the transaction
   * @param eventId the event trigger id
   */
  static mockMetaDataPaymentTransaction = (
    outBoxes: TransactionOutput[],
    eventId: string
  ): PaymentTransaction => {
    const txBuilder = TransactionBuilder.new(CardanoConfigs.txBuilderConfig);
    outBoxes.forEach((box) => txBuilder.add_output(box));

    // // create the transaction
    const k = BigNum.from_str('0');
    const d = TransactionMetadatum.new_text('metadata');
    const metaData = GeneralTransactionMetadata.new();
    metaData.insert(k, d);
    const txData = AuxiliaryData.new();
    txData.set_metadata(metaData);

    // set transaction TTL and Fee
    txBuilder.set_ttl(CardanoConfigs.txTtl);
    txBuilder.set_fee(CardanoConfigs.txFee);
    txBuilder.add_metadatum(k, d);
    txBuilder.set_auxiliary_data(txData);
    const txBody = txBuilder.build();

    const tx = Transaction.new(
      txBody,
      TransactionWitnessSet.new(),
      txData // transaction metadata
    );

    // create PaymentTransaction object
    const txId = Utils.Uint8ArrayToHexString(
      hash_transaction(tx.body()).to_bytes()
    );
    const txBytes = tx.to_bytes();
    return new CardanoTransaction(
      txId,
      eventId,
      txBytes,
      TransactionTypes.payment
    );
  };

  /**
   * generates a mocked payment transaction that transfers two assets with same policyId
   * @param event asset payment event trigger
   * @param bankAddress bank address
   */
  static mockAssetTransferringPaymentTransaction = (
    event: EventTrigger,
    bankAddress: string
  ): PaymentTransaction => {
    // calculate assets of payment box
    const paymentAmount: BigNum = BigNum.from_str(event.amount)
      .checked_sub(BigNum.from_str(event.bridgeFee))
      .checked_sub(BigNum.from_str(event.networkFee));

    const illegalAssetUnit: Uint8Array = Buffer.from(
      TestUtils.generateRandomId(),
      'hex'
    );
    const illegalAssetPolicyId: ScriptHash = ScriptHash.from_bytes(
      illegalAssetUnit.slice(0, 28)
    );
    const illegalAssetAssetName: AssetName = AssetName.new(
      illegalAssetUnit.slice(28)
    );
    const paymentMultiAsset = MultiAsset.new();
    const illegalAssets = Assets.new();
    illegalAssets.insert(illegalAssetAssetName, BigNum.from_str('1000'));
    paymentMultiAsset.insert(illegalAssetPolicyId, illegalAssets);
    const paymentValue = Value.new(paymentAmount);
    paymentValue.set_multiasset(paymentMultiAsset);

    // create the payment box
    const paymentBox = TransactionOutput.new(
      Address.from_bech32(event.toAddress),
      paymentValue
    );

    // create the payment box
    const changeBox = TransactionOutput.new(
      Address.from_bech32(bankAddress),
      Value.new(BigNum.from_str(this.adaToLovelaceString(10)))
    );

    return this.mockPaymentTransaction([paymentBox, changeBox], event.getId());
  };

  /**
   * generates a mocked payment transaction that transfers no assets
   * @param event asset payment event trigger
   * @param bankAddress bank address
   */
  static mockNoAssetsTransferringPaymentTransaction = (
    event: EventTrigger,
    bankAddress: string
  ): PaymentTransaction => {
    const lovelacePaymentAmount: BigNum = CardanoConfigs.txMinimumLovelace;

    const paymentValue = Value.new(lovelacePaymentAmount);

    // create the payment box
    const paymentBox = TransactionOutput.new(
      Address.from_bech32(event.toAddress),
      paymentValue
    );

    // create the payment box
    const changeBox = TransactionOutput.new(
      Address.from_bech32(bankAddress),
      Value.new(BigNum.from_str(this.adaToLovelaceString(10)))
    );

    return this.mockPaymentTransaction([paymentBox, changeBox], event.getId());
  };

  /**
   * generates a mocked payment transaction that transfers two assets with same policyId
   * @param event asset payment event trigger
   * @param bankAddress bank address
   */
  static mockMultiAssetsTransferringPaymentTransaction = (
    event: EventTrigger,
    bankAddress: string
  ): PaymentTransaction => {
    const lovelacePaymentAmount: BigNum = CardanoConfigs.txMinimumLovelace;
    const assetPaymentAmount: BigNum = BigNum.from_str(event.amount)
      .checked_sub(BigNum.from_str(event.bridgeFee))
      .checked_sub(BigNum.from_str(event.networkFee));

    const paymentAssetInfo = CardanoUtils.getCardanoAssetInfo(
      event.targetChainTokenId
    );
    const paymentAssetPolicyId: ScriptHash = ScriptHash.from_bytes(
      paymentAssetInfo.policyId
    );
    const paymentAssetAssetName: AssetName = AssetName.new(
      paymentAssetInfo.assetName
    );
    const illegalAssetAssetName: AssetName = AssetName.new(
      Buffer.from('7369676d61', 'hex')
    );
    const paymentMultiAsset = MultiAsset.new();
    const paymentAssets = Assets.new();
    paymentAssets.insert(paymentAssetAssetName, assetPaymentAmount);
    paymentAssets.insert(illegalAssetAssetName, BigNum.from_str('100'));
    paymentMultiAsset.insert(paymentAssetPolicyId, paymentAssets);
    const paymentValue = Value.new(lovelacePaymentAmount);
    paymentValue.set_multiasset(paymentMultiAsset);

    // create the payment box
    const paymentBox = TransactionOutput.new(
      Address.from_bech32(event.toAddress),
      paymentValue
    );

    // create the payment box
    const changeBox = TransactionOutput.new(
      Address.from_bech32(bankAddress),
      Value.new(BigNum.from_str(this.adaToLovelaceString(10)))
    );

    return this.mockPaymentTransaction([paymentBox, changeBox], event.getId());
  };

  /**
   * generates a mocked valid payment transaction
   * @param event asset payment event trigger
   * @param bankAddress bank address
   */
  static mockValidPaymentTransaction = (
    event: EventTrigger,
    bankAddress: string
  ): PaymentTransaction => {
    const lovelacePaymentAmount: BigNum = CardanoConfigs.txMinimumLovelace;
    const assetPaymentAmount: BigNum = BigNum.from_str(event.amount)
      .checked_sub(BigNum.from_str(event.bridgeFee))
      .checked_sub(BigNum.from_str(event.networkFee));

    const paymentAssetInfo = CardanoUtils.getCardanoAssetInfo(
      event.targetChainTokenId
    );
    const paymentAssetPolicyId: ScriptHash = ScriptHash.from_bytes(
      paymentAssetInfo.policyId
    );
    const paymentAssetAssetName: AssetName = AssetName.new(
      paymentAssetInfo.assetName
    );
    const paymentMultiAsset = MultiAsset.new();
    const paymentAssets = Assets.new();
    paymentAssets.insert(paymentAssetAssetName, assetPaymentAmount);
    paymentMultiAsset.insert(paymentAssetPolicyId, paymentAssets);
    const paymentValue = Value.new(lovelacePaymentAmount);
    paymentValue.set_multiasset(paymentMultiAsset);

    // create the payment box
    const paymentBox = TransactionOutput.new(
      Address.from_bech32(event.toAddress),
      paymentValue
    );

    // create the payment box
    const changeBox = TransactionOutput.new(
      Address.from_bech32(bankAddress),
      Value.new(BigNum.from_str(this.adaToLovelaceString(10)))
    );

    return this.mockPaymentTransaction([paymentBox, changeBox], event.getId());
  };

  /**
   * generates a mocked payment transaction that has a metadata
   * @param event asset payment event trigger
   * @param bankAddress bank address
   */
  static mockPaymentTransactionWithMetadata = (
    event: EventTrigger,
    bankAddress: string
  ): PaymentTransaction => {
    const lovelacePaymentAmount: BigNum = CardanoConfigs.txMinimumLovelace;
    const assetPaymentAmount: BigNum = BigNum.from_str(event.amount)
      .checked_sub(BigNum.from_str(event.bridgeFee))
      .checked_sub(BigNum.from_str(event.networkFee));

    const paymentAssetInfo = CardanoUtils.getCardanoAssetInfo(
      event.targetChainTokenId
    );
    const paymentAssetPolicyId: ScriptHash = ScriptHash.from_bytes(
      paymentAssetInfo.policyId
    );
    const paymentAssetAssetName: AssetName = AssetName.new(
      paymentAssetInfo.assetName
    );
    const paymentMultiAsset = MultiAsset.new();
    const paymentAssets = Assets.new();
    paymentAssets.insert(paymentAssetAssetName, assetPaymentAmount);
    paymentMultiAsset.insert(paymentAssetPolicyId, paymentAssets);
    const paymentValue = Value.new(lovelacePaymentAmount);
    paymentValue.set_multiasset(paymentMultiAsset);

    // create the payment box
    const paymentBox = TransactionOutput.new(
      Address.from_bech32(event.toAddress),
      paymentValue
    );

    // create the payment box
    const changeBox = TransactionOutput.new(
      Address.from_bech32(bankAddress),
      Value.new(BigNum.from_str(this.adaToLovelaceString(10)))
    );

    return this.mockMetaDataPaymentTransaction(
      [paymentBox, changeBox],
      event.getId()
    );
  };

  /**
   * generates a mocked payment transaction that transfers two assets with same policyId
   * @param event asset payment event trigger
   * @param bankAddress bank address
   */
  static mockTwoAssetsTransferringPaymentTransaction = (
    event: EventTrigger,
    bankAddress: string
  ): PaymentTransaction => {
    const lovelacePaymentAmount: BigNum = CardanoConfigs.txMinimumLovelace;
    const assetPaymentAmount: BigNum = BigNum.from_str(event.amount)
      .checked_sub(BigNum.from_str(event.bridgeFee))
      .checked_sub(BigNum.from_str(event.networkFee));

    const paymentAssetInfo = CardanoUtils.getCardanoAssetInfo(
      event.targetChainTokenId
    );
    const paymentAssetPolicyId: ScriptHash = ScriptHash.from_bytes(
      paymentAssetInfo.policyId
    );
    const paymentAssetAssetName: AssetName = AssetName.new(
      paymentAssetInfo.assetName
    );
    const illegalAssetUnit: Uint8Array = Buffer.from(
      TestUtils.generateRandomId(),
      'hex'
    );
    const illegalAssetPolicyId: ScriptHash = ScriptHash.from_bytes(
      illegalAssetUnit.slice(0, 28)
    );
    const illegalAssetAssetName: AssetName = AssetName.new(
      illegalAssetUnit.slice(28)
    );
    const paymentMultiAsset = MultiAsset.new();
    const paymentAssets = Assets.new();
    paymentAssets.insert(paymentAssetAssetName, assetPaymentAmount);
    const illegalAssets = Assets.new();
    illegalAssets.insert(illegalAssetAssetName, BigNum.from_str('1000'));
    paymentMultiAsset.insert(paymentAssetPolicyId, paymentAssets);
    paymentMultiAsset.insert(illegalAssetPolicyId, illegalAssets);
    const paymentValue = Value.new(lovelacePaymentAmount);
    paymentValue.set_multiasset(paymentMultiAsset);

    // create the payment box
    const paymentBox = TransactionOutput.new(
      Address.from_bech32(event.toAddress),
      paymentValue
    );

    // create the payment box
    const changeBox = TransactionOutput.new(
      Address.from_bech32(bankAddress),
      Value.new(BigNum.from_str(this.adaToLovelaceString(10)))
    );

    return this.mockPaymentTransaction([paymentBox, changeBox], event.getId());
  };

  /**
   * generates a mocked TxUtxos
   */
  static mockTxUtxos = (
    txId: string,
    boxesLen: number,
    boxAddr: string
  ): TxUtxos => {
    return JSON.parse(TestData.mockTxUtxo(txId, boxesLen, boxAddr)) as TxUtxos;
  };

  /**
   * generates a mocked AddressUtxos
   */
  static mockAddressUtxos = (
    boxTxs: string[],
    boxIndexes: number[]
  ): AddressUtxos => {
    return JSON.parse(
      TestData.mockAddressUtxo(boxTxs, boxIndexes)
    ) as AddressUtxos;
  };

  /**
   * generates a mocked ADA payment transaction
   */
  static mockADAPaymentTransaction = (
    event: EventTrigger
  ): PaymentTransaction => {
    return PaymentTransaction.fromJson(
      TestData.adaPaymentTransaction(event.getId())
    );
  };

  /**
   * generates a mocked Asset payment transaction that its ttl is less than current slot
   */
  static mockTTLPastAssetPaymentTx = (
    event: EventTrigger
  ): PaymentTransaction => {
    return PaymentTransaction.fromJson(
      TestData.tllPastAssetPaymentTx(event.getId())
    );
  };

  /**
   * returns a mocked object of CardanoTransaction
   */
  static mockCardanoTransaction = (): CardanoTransaction => {
    return mock(CardanoTransaction);
  };

  static mediumAddressAssets: AddressAssets = {
    address: CardanoConfigs.bankAddress,
    assets: [
      {
        policy_id: 'ace7bcc2ce705679149746620de3a84660ce57573df54b5a096e39a2',
        asset_name: '7369676d61',
        quantity: '4000000000',
        fingerprint: 'asset1nl0puwxmhas8fawxp8nx4e2q3wekg969n2auw3',
      },
      {
        policy_id: '22c3b86a5b88a78b5de52f4aed2831d1483b3b7681f1ee2569538130',
        asset_name: '1111111111',
        quantity: '225000000000',
        fingerprint: 'asset1nl000000000000000000000000000000000000',
      },
    ],
  };

  static highAssetAddressAssets: AddressAssets = {
    address: CardanoConfigs.bankAddress,
    assets: [
      {
        policy_id: 'ace7bcc2ce705679149746620de3a84660ce57573df54b5a096e39a2',
        asset_name: '7369676d61',
        quantity: '999000000000',
        fingerprint: 'asset1nl0puwxmhas8fawxp8nx4e2q3wekg969n2auw3',
      },
      {
        policy_id: '22c3b86a5b88a78b5de52f4aed2831d1483b3b7681f1ee2569538130',
        asset_name: '1111111111',
        quantity: '225000000000',
        fingerprint: 'asset1nl000000000000000000000000000000000000',
      },
    ],
  };

  static mediumLovelaceAddressInfo: AddressInfo = {
    address: CardanoConfigs.bankAddress,
    balance: 200000000n,
    utxo_set: [],
  };

  static highLovelaceAddressInfo: AddressInfo = {
    address: CardanoConfigs.bankAddress,
    balance: 900000000n,
    utxo_set: [],
  };

  static mockHighAdaAddressInfoAndAssets = (): [AddressInfo, AddressAssets] => {
    const box1: Utxo = {
      payment_addr: { bech32: '' },
      tx_hash: TestUtils.generateRandomId(),
      tx_index: 0,
      value: this.adaToLovelaceString(200),
      asset_list: [
        {
          policy_id: 'ace7bcc2ce705679149746620de3a84660ce57573df54b5a096e39a2',
          asset_name: '7369676d61',
          quantity: '43000000000',
          fingerprint: 'asset1nl0puwxmhas8fawxp8nx4e2q3wekg969n2auw3',
        },
        {
          policy_id: 'b8aa6f60b48ad4cb0f623edc96eb4dffb652b3a2384287b22c8814ac',
          asset_name: '5659464974',
          quantity: '5000000',
          fingerprint: 'asset16adhl77t3cmca442g4gzy3mdn905yurvljllr4',
        },
      ],
    };
    const box2: Utxo = {
      payment_addr: { bech32: '' },
      tx_hash: TestUtils.generateRandomId(),
      tx_index: 0,
      value: this.adaToLovelaceString(80),
      asset_list: [
        {
          policy_id: '22c3b86a5b88a78b5de52f4aed2831d1483b3b7681f1ee2569538130',
          asset_name: '1111111111',
          quantity: '205000000000',
          fingerprint: 'asset1nl000000000000000000000000000000000000',
        },
      ],
    };
    const box3: Utxo = {
      payment_addr: { bech32: '' },
      tx_hash: TestUtils.generateRandomId(),
      tx_index: 0,
      value: this.adaToLovelaceString(80),
      asset_list: [
        {
          policy_id: '22c3b86a5b88a78b5de52f4aed2831d1483b3b7681f1ee2569538130',
          asset_name: '1111111111',
          quantity: '235000000000',
          fingerprint: 'asset1nl000000000000000000000000000000000000',
        },
      ],
    };

    const utxoSet = [box1, box2, box3];
    const addressInfo: AddressInfo = {
      address: CardanoConfigs.bankAddress,
      balance: 360000000n,
      utxo_set: utxoSet,
    };

    const addressAssets: AddressAssets = {
      address: CardanoConfigs.bankAddress,
      assets: [
        {
          policy_id: 'ace7bcc2ce705679149746620de3a84660ce57573df54b5a096e39a2',
          asset_name: '7369676d61',
          quantity: '43000000000',
          fingerprint: 'asset1nl0puwxmhas8fawxp8nx4e2q3wekg969n2auw3',
        },
        {
          policy_id: '22c3b86a5b88a78b5de52f4aed2831d1483b3b7681f1ee2569538130',
          asset_name: '1111111111',
          quantity: '440000000000',
          fingerprint: 'asset1nl000000000000000000000000000000000000',
        },
        {
          policy_id: 'b8aa6f60b48ad4cb0f623edc96eb4dffb652b3a2384287b22c8814ac',
          asset_name: '5659464974',
          quantity: '5000000',
          fingerprint: 'asset16adhl77t3cmca442g4gzy3mdn905yurvljllr4',
        },
      ],
    };

    return [addressInfo, addressAssets];
  };

  static mockHighAssetAddressInfoAndAssets = (): [
    AddressInfo,
    AddressAssets
  ] => {
    const box1: Utxo = {
      payment_addr: { bech32: '' },
      tx_hash: TestUtils.generateRandomId(),
      tx_index: 0,
      value: this.adaToLovelaceString(200),
      asset_list: [
        {
          policy_id: 'ace7bcc2ce705679149746620de3a84660ce57573df54b5a096e39a2',
          asset_name: '7369676d61',
          quantity: '43000000000',
          fingerprint: 'asset1nl0puwxmhas8fawxp8nx4e2q3wekg969n2auw3',
        },
        {
          policy_id: 'b8aa6f60b48ad4cb0f623edc96eb4dffb652b3a2384287b22c8814ac',
          asset_name: '5659464974',
          quantity: '5000000',
          fingerprint: 'asset16adhl77t3cmca442g4gzy3mdn905yurvljllr4',
        },
      ],
    };
    const box2: Utxo = {
      payment_addr: { bech32: '' },
      tx_hash: TestUtils.generateRandomId(),
      tx_index: 0,
      value: this.adaToLovelaceString(80),
      asset_list: [
        {
          policy_id: '22c3b86a5b88a78b5de52f4aed2831d1483b3b7681f1ee2569538130',
          asset_name: '1111111111',
          quantity: '305000000000',
          fingerprint: 'asset1nl000000000000000000000000000000000000',
        },
      ],
    };
    const box3: Utxo = {
      payment_addr: { bech32: '' },
      tx_hash: TestUtils.generateRandomId(),
      tx_index: 0,
      value: this.adaToLovelaceString(80),
      asset_list: [
        {
          policy_id: '22c3b86a5b88a78b5de52f4aed2831d1483b3b7681f1ee2569538130',
          asset_name: '1111111111',
          quantity: '335000000000',
          fingerprint: 'asset1nl000000000000000000000000000000000000',
        },
        {
          policy_id: '22c3b86a5b88a78b5de52f4aed2831d1483b3b7681f1ee2569538130',
          asset_name: '2222222222',
          quantity: '1000000',
          fingerprint: 'asset1nl000000000022220000001111000000000333',
        },
      ],
    };

    const utxoSet = [box1, box2, box3];
    const addressInfo: AddressInfo = {
      address: CardanoConfigs.bankAddress,
      balance: 360000000n,
      utxo_set: utxoSet,
    };

    const addressAssets: AddressAssets = {
      address: CardanoConfigs.bankAddress,
      assets: [
        {
          policy_id: 'ace7bcc2ce705679149746620de3a84660ce57573df54b5a096e39a2',
          asset_name: '7369676d61',
          quantity: '43000000000',
          fingerprint: 'asset1nl0puwxmhas8fawxp8nx4e2q3wekg969n2auw3',
        },
        {
          policy_id: '22c3b86a5b88a78b5de52f4aed2831d1483b3b7681f1ee2569538130',
          asset_name: '1111111111',
          quantity: '640000000000',
          fingerprint: 'asset1nl000000000000000000000000000000000000',
        },
        {
          policy_id: 'b8aa6f60b48ad4cb0f623edc96eb4dffb652b3a2384287b22c8814ac',
          asset_name: '5659464974',
          quantity: '5000000',
          fingerprint: 'asset16adhl77t3cmca442g4gzy3mdn905yurvljllr4',
        },
        {
          policy_id: '22c3b86a5b88a78b5de52f4aed2831d1483b3b7681f1ee2569538130',
          asset_name: '2222222222',
          quantity: '1000000',
          fingerprint: 'asset1nl000000000022220000001111000000000333',
        },
      ],
    };

    return [addressInfo, addressAssets];
  };

  /**
   * generates a find mocked cold storage transaction with given outBoxes
   * @param outBoxes output Utxos in the transaction
   */
  static mockFineColdStorageTransaction = (
    outBoxes: TransactionOutput[]
  ): PaymentTransaction => {
    const txBuilder = TransactionBuilder.new(CardanoConfigs.txBuilderConfig);
    outBoxes.forEach((box) => txBuilder.add_output(box));

    // set transaction TTL and Fee
    txBuilder.set_ttl(CardanoConfigs.txTtl);
    txBuilder.set_fee(CardanoConfigs.txFee);

    // create the transaction
    const txBody = txBuilder.build();
    const tx = Transaction.new(
      txBody,
      TransactionWitnessSet.new(),
      undefined // transaction metadata
    );

    // create PaymentTransaction object
    const txId = Utils.Uint8ArrayToHexString(
      hash_transaction(tx.body()).to_bytes()
    );
    const txBytes = tx.to_bytes();
    return new CardanoTransaction(
      txId,
      '',
      txBytes,
      TransactionTypes.coldStorage
    );
  };

  /**
   * generates a mocked cold storage transaction with metadata
   */
  static mockFineColdStorageTx = (): PaymentTransaction => {
    // create the cold box
    const coldBoxValueJson = `{
      "coin": "258248310",
      "multiasset": {}
    }`;
    const coldBox = TransactionOutput.new(
      Address.from_bech32(CardanoConfigs.coldAddress),
      Value.from_json(coldBoxValueJson)
    );

    // create the change box
    const changeBoxValueJson = `{
      "coin": "101551690",
      "multiasset": {
        "22c3b86a5b88a78b5de52f4aed2831d1483b3b7681f1ee2569538130": {
          "1111111111": "440000000000"
        },
        "ace7bcc2ce705679149746620de3a84660ce57573df54b5a096e39a2": {
          "7369676d61": "43000000000"
        },
        "b8aa6f60b48ad4cb0f623edc96eb4dffb652b3a2384287b22c8814ac": {
          "5659464974": "5000000"
        }
      }
    }`;
    const changeBox = TransactionOutput.new(
      Address.from_bech32(this.testBankAddress),
      Value.from_json(changeBoxValueJson)
    );

    return this.mockFineColdStorageTransaction([coldBox, changeBox]);
  };

  /**
   * generates a mocked cold storage transaction that has additional output box
   */
  static mock3outBoxColdStorageTx = (): PaymentTransaction => {
    // create the cold box
    const coldBoxValueJson = TestData.fineColdBoxValueJson;
    const coldBox = TransactionOutput.new(
      Address.from_bech32(CardanoConfigs.coldAddress),
      Value.from_json(coldBoxValueJson)
    );

    // create the change box
    const changeBoxValueJson = `{
      "coin": "91551690",
      "multiasset": {
        "22c3b86a5b88a78b5de52f4aed2831d1483b3b7681f1ee2569538130": {
          "1111111111": "440000000000"
        },
        "ace7bcc2ce705679149746620de3a84660ce57573df54b5a096e39a2": {
          "7369676d61": "43000000000"
        },
        "b8aa6f60b48ad4cb0f623edc96eb4dffb652b3a2384287b22c8814ac": {
          "5659464974": "5000000"
        }
      }
    }`;
    const changeBox = TransactionOutput.new(
      Address.from_bech32(this.testBankAddress),
      Value.from_json(changeBoxValueJson)
    );

    // create the additional box
    const additionalBoxValueJson = `{
      "coin": "10000000",
      "multiasset": {}
    }`;
    const additionalBox = TransactionOutput.new(
      Address.from_bech32(this.testBankAddress),
      Value.from_json(additionalBoxValueJson)
    );

    return this.mockFineColdStorageTransaction([
      coldBox,
      changeBox,
      additionalBox,
    ]);
  };

  /**
   * generates a mocked cold storage transaction with invalid coldBox address
   */
  static mockInvalidColdAddressColdStorageTx = (): PaymentTransaction => {
    // create the cold box
    const coldBoxValueJson = TestData.fineColdBoxValueJson;
    const coldBox = TransactionOutput.new(
      Address.from_bech32(this.testBankAddress),
      Value.from_json(coldBoxValueJson)
    );

    // create the change box
    const changeBoxValueJson = TestData.fineChangeBoxValueJson;
    const changeBox = TransactionOutput.new(
      Address.from_bech32(this.testBankAddress),
      Value.from_json(changeBoxValueJson)
    );

    return this.mockFineColdStorageTransaction([coldBox, changeBox]);
  };

  /**
   * generates a mocked cold storage transaction with invalid changeBox address
   */
  static mockInvalidChangeAddressColdStorageTx = (): PaymentTransaction => {
    // create the cold box
    const coldBoxValueJson = TestData.fineColdBoxValueJson;
    const coldBox = TransactionOutput.new(
      Address.from_bech32(CardanoConfigs.coldAddress),
      Value.from_json(coldBoxValueJson)
    );

    // create the change box
    const changeBoxValueJson = TestData.fineChangeBoxValueJson;
    const changeBox = TransactionOutput.new(
      Address.from_bech32(CardanoConfigs.coldAddress),
      Value.from_json(changeBoxValueJson)
    );

    return this.mockFineColdStorageTransaction([coldBox, changeBox]);
  };

  /**
   * generates a mocked cold storage transaction with metadata using given outBoxes
   * @param outBoxes output Utxos in the transaction
   */
  static mockMetadataColdStorageTransaction = (
    outBoxes: TransactionOutput[]
  ): PaymentTransaction => {
    const txBuilder = TransactionBuilder.new(CardanoConfigs.txBuilderConfig);
    outBoxes.forEach((box) => txBuilder.add_output(box));

    // set transaction TTL and Fee
    txBuilder.set_ttl(CardanoConfigs.txTtl);
    txBuilder.set_fee(CardanoConfigs.txFee);

    // Event metadata
    const map = MetadataMap.new();
    map.insert(
      TransactionMetadatum.new_text('to'),
      TransactionMetadatum.new_text('ergo')
    );
    map.insert(
      TransactionMetadatum.new_text('toAddress'),
      TransactionMetadatum.new_text('testAddress')
    );

    const index = BigNum.from_str('0');
    const metadataMap = TransactionMetadatum.new_map(map);

    const generalMetaData = GeneralTransactionMetadata.new();
    generalMetaData.insert(index, metadataMap);

    txBuilder.add_metadatum(index, metadataMap);
    const data = AuxiliaryData.new();
    data.set_metadata(generalMetaData);

    // create the transaction
    const txBody = txBuilder.build();
    const tx = Transaction.new(
      txBody,
      TransactionWitnessSet.new(),
      data // transaction metadata
    );

    // create PaymentTransaction object
    const txId = Utils.Uint8ArrayToHexString(
      hash_transaction(tx.body()).to_bytes()
    );
    const txBytes = tx.to_bytes();
    return new CardanoTransaction(
      txId,
      '',
      txBytes,
      TransactionTypes.coldStorage
    );
  };

  /**
   * generates a mocked cold storage transaction with metadata
   */
  static mockColdStorageTxWithMetadata = (): PaymentTransaction => {
    // create the cold box
    const coldBoxValueJson = TestData.fineColdBoxValueJson;
    const coldBox = TransactionOutput.new(
      Address.from_bech32(CardanoConfigs.coldAddress),
      Value.from_json(coldBoxValueJson)
    );

    // create the change box
    const changeBoxValueJson = TestData.fineChangeBoxValueJson;
    const changeBox = TransactionOutput.new(
      Address.from_bech32(this.testBankAddress),
      Value.from_json(changeBoxValueJson)
    );

    return this.mockMetadataColdStorageTransaction([coldBox, changeBox]);
  };

  /**
   * generates a find mocked cold storage transaction with given outBoxes
   * @param outBoxes output Utxos in the transaction
   */
  static mockInvalidFeeColdStorageTransaction = (
    outBoxes: TransactionOutput[]
  ): PaymentTransaction => {
    const txBuilder = TransactionBuilder.new(CardanoConfigs.txBuilderConfig);
    outBoxes.forEach((box) => txBuilder.add_output(box));

    // set transaction TTL and Fee
    txBuilder.set_ttl(CardanoConfigs.txTtl);
    txBuilder.set_fee(CardanoConfigs.txFee.checked_add(CardanoConfigs.txFee));

    // create the transaction
    const txBody = txBuilder.build();
    const tx = Transaction.new(
      txBody,
      TransactionWitnessSet.new(),
      undefined // transaction metadata
    );

    // create PaymentTransaction object
    const txId = Utils.Uint8ArrayToHexString(
      hash_transaction(tx.body()).to_bytes()
    );
    const txBytes = tx.to_bytes();
    return new CardanoTransaction(
      txId,
      '',
      txBytes,
      TransactionTypes.coldStorage
    );
  };

  /**
   * generates a mocked cold storage transaction with additional tx fee
   */
  static mockColdStorageTxWithAdditionalFee = (): PaymentTransaction => {
    // create the cold box
    const coldBoxValueJson = TestData.fineColdBoxValueJson;
    const coldBox = TransactionOutput.new(
      Address.from_bech32(CardanoConfigs.coldAddress),
      Value.from_json(coldBoxValueJson)
    );

    // create the change box
    const changeBoxValueJson = `{
      "coin": "101351690",
      "multiasset": {
        "22c3b86a5b88a78b5de52f4aed2831d1483b3b7681f1ee2569538130": {
          "1111111111": "440000000000"
        },
        "ace7bcc2ce705679149746620de3a84660ce57573df54b5a096e39a2": {
          "7369676d61": "43000000000"
        },
        "b8aa6f60b48ad4cb0f623edc96eb4dffb652b3a2384287b22c8814ac": {
          "5659464974": "5000000"
        }
      }
    }`;
    const changeBox = TransactionOutput.new(
      Address.from_bech32(this.testBankAddress),
      Value.from_json(changeBoxValueJson)
    );

    return this.mockInvalidFeeColdStorageTransaction([coldBox, changeBox]);
  };

  /**
   * generates a mocked cold storage transaction resulting in ada less than its low threshold
   */
  static mockHighAdaColdStorageTx = (): PaymentTransaction => {
    // create the cold box
    const coldBoxValueJson = `{
      "coin": "260248310",
      "multiasset": {}
    }`;
    const coldBox = TransactionOutput.new(
      Address.from_bech32(CardanoConfigs.coldAddress),
      Value.from_json(coldBoxValueJson)
    );

    // create the change box
    const changeBoxValueJson = `{
      "coin": "99551690",
      "multiasset": {
        "22c3b86a5b88a78b5de52f4aed2831d1483b3b7681f1ee2569538130": {
          "1111111111": "440000000000"
        },
        "ace7bcc2ce705679149746620de3a84660ce57573df54b5a096e39a2": {
          "7369676d61": "43000000000"
        },
        "b8aa6f60b48ad4cb0f623edc96eb4dffb652b3a2384287b22c8814ac": {
          "5659464974": "5000000"
        }
      }
    }`;
    const changeBox = TransactionOutput.new(
      Address.from_bech32(this.testBankAddress),
      Value.from_json(changeBoxValueJson)
    );

    return this.mockFineColdStorageTransaction([coldBox, changeBox]);
  };

  /**
   * generates a mocked cold storage transaction resulting in asset less than its low threshold
   */
  static mockHighAssetColdStorageTx = (): PaymentTransaction => {
    // create the cold box
    const coldBoxValueJson = `{
      "coin": "258248310",
      "multiasset": {
        "22c3b86a5b88a78b5de52f4aed2831d1483b3b7681f1ee2569538130": {
          "1111111111": "525000000000"
        }
      }
    }`;
    const coldBox = TransactionOutput.new(
      Address.from_bech32(CardanoConfigs.coldAddress),
      Value.from_json(coldBoxValueJson)
    );
    // create the change box
    const changeBoxValueJson = `{
      "coin": "101551690",
      "multiasset": {
        "22c3b86a5b88a78b5de52f4aed2831d1483b3b7681f1ee2569538130": {
          "1111111111": "115000000000",
          "2222222222": "1000000"
        },
        "ace7bcc2ce705679149746620de3a84660ce57573df54b5a096e39a2": {
          "7369676d61": "43000000000"
        },
        "b8aa6f60b48ad4cb0f623edc96eb4dffb652b3a2384287b22c8814ac": {
          "5659464974": "5000000"
        }
      }
    }`;
    const changeBox = TransactionOutput.new(
      Address.from_bech32(this.testBankAddress),
      Value.from_json(changeBoxValueJson)
    );

    return this.mockFineColdStorageTransaction([coldBox, changeBox]);
  };

  /**
   * generates a mocked cold storage transaction resulting in ada more than its high threshold
   */
  static mockLowAdaColdStorageTx = (): PaymentTransaction => {
    // create the cold box
    const coldBoxValueJson = `{
      "coin": "18248310",
      "multiasset": {}
    }`;
    const coldBox = TransactionOutput.new(
      Address.from_bech32(CardanoConfigs.coldAddress),
      Value.from_json(coldBoxValueJson)
    );

    // create the change box
    const changeBoxValueJson = `{
      "coin": "341551690",
      "multiasset": {
        "22c3b86a5b88a78b5de52f4aed2831d1483b3b7681f1ee2569538130": {
          "1111111111": "440000000000"
        },
        "ace7bcc2ce705679149746620de3a84660ce57573df54b5a096e39a2": {
          "7369676d61": "43000000000"
        },
        "b8aa6f60b48ad4cb0f623edc96eb4dffb652b3a2384287b22c8814ac": {
          "5659464974": "5000000"
        }
      }
    }`;
    const changeBox = TransactionOutput.new(
      Address.from_bech32(this.testBankAddress),
      Value.from_json(changeBoxValueJson)
    );

    return this.mockFineColdStorageTransaction([coldBox, changeBox]);
  };
}

export default TestBoxes;
