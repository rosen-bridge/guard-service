import {
  EventTrigger,
  PaymentTransaction,
  TransactionTypes,
} from '../../../../src/models/Models';
import TestUtils from '../../../testUtils/TestUtils';
import {
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
      '',
      ChainsConstants.cardano,
      '',
      'addr_test1qqn3eyyydsztynkk2f3x4hsfz46klqf6xncp2em92mgt3qtvvz7nw9gmznn65g4ksrrfvyzhz52knc3mqxdyya47gz2qppk5jd',
      '51300000',
      '1000000',
      '300000',
      '',
      'lovelace',
      TestUtils.generateRandomId(),
      '',
      []
    );
  };

  /**
   * generates a mocked event trigger for asset payment in cardano chain
   */
  static mockAssetPaymentEventTrigger = (): EventTrigger => {
    return new EventTrigger(
      '',
      ChainsConstants.cardano,
      '',
      'addr_test1qqn3eyyydsztynkk2f3x4hsfz46klqf6xncp2em92mgt3qtvvz7nw9gmznn65g4ksrrfvyzhz52knc3mqxdyya47gz2qppk5jd',
      '80',
      '10',
      '5',
      '',
      'asset1nl0puwxmhas8fawxp8nx4e2q3wekg969n2auw3',
      TestUtils.generateRandomId(),
      '',
      []
    );
  };

  /**
   * generates a mocked event trigger for event verification in cardano chain
   */
  static mockValidEventTrigger = (): EventTrigger => {
    return new EventTrigger(
      'cardano',
      'ergo',
      'addr_test1qzf9uxs6xgprx4zt20qtsasxut8uw6quv34xlkmd26yuk5xe70s0yf5c3sefnrft6gdajkpz29t8lsn0kcr5xqsf34qqxd6n4f',
      'ergoAddress',
      '13060',
      '250',
      '10000',
      'asset1nl0puwxmhas8fawxp8nx4e2q3wekg969n2auw3',
      '0034c44f0c7a38f833190d44125ff9b3a0dd9dbb89138160182a930bc521db95',
      '928052b80bfc23801da525a6bf8f805da36f22fa0fd5fec2198b0746eb82b72b',
      'f75fea40852ed7d7f539d008e45255725daef8553ae7162750836f279570813a',
      []
    );
  };

  /**
   * generates a mocked event trigger for event verification in cardano chain
   */
  static mockInValidMetadataEventTrigger = (): EventTrigger => {
    return new EventTrigger(
      'cardano',
      'ergo',
      'addr_test1qzf9uxs6xgprx4zt20qtsasxut8uw6quv34xlkmd26yuk5xe70s0yf5c3sefnrft6gdajkpz29t8lsn0kcr5xqsf34qqxd6n4f',
      'ergoAddress',
      '13060',
      '250',
      '10000',
      'asset1nl0puwxmhas8fawxp8nx4e2q3wekg969n2auw3',
      '0034c44f0c7a38f833190d44125ff9b3a0dd9dbb89138160182a930bc521db95',
      '028052b80bfc23801da525a6bf8f805da36f22fa0fd5fec2198b0746eb82b72b',
      'f75fea40852ed7d7f539d008e45255725daef8553ae7162750836f279570813a',
      []
    );
  };

  /**
   * generates a mocked event trigger for event verification in cardano chain
   */
  static mockInValidTokenEventTrigger = (): EventTrigger => {
    return new EventTrigger(
      'cardano',
      'ergo',
      'addr_test1qzf9uxs6xgprx4zt20qtsasxut8uw6quv34xlkmd26yuk5xe70s0yf5c3sefnrft6gdajkpz29t8lsn0kcr5xqsf34qqxd6n4f',
      'ergoAddress',
      '13060',
      '250',
      '10000',
      'asset1nl0puwxmhas8fawxp8nx4e2q3wekg969n2auw3',
      '0034c44f0c7a38f833190d44125ff9b3a0dd9dbb89138160182a930bc521db95',
      '128052b80bfc23801da525a6bf8f805da36f22fa0fd5fec2198b0746eb82b72b',
      'f75fea40852ed7d7f539d008e45255725daef8553ae7162750836f279570813a',
      []
    );
  };

  /**
   * generates a mocked event trigger for event verification in cardano chain locking Ada
   */
  static mockValidAdaEventTrigger = (): EventTrigger => {
    return new EventTrigger(
      'cardano',
      'ergo',
      'addr_test1qzf9uxs6xgprx4zt20qtsasxut8uw6quv34xlkmd26yuk5xe70s0yf5c3sefnrft6gdajkpz29t8lsn0kcr5xqsf34qqxd6n4f',
      'ergoAddress',
      '49796752',
      '250',
      '10000',
      'lovelace',
      '064c58ea394d41fada074a3c560a132467adf4ca1512c409c014c625ca285e9c',
      '00ee077854471a04fbef18a5a971b50fb39f52fc6f6b3b8d0682ce2c48f6ebef',
      'f75fea40852ed7d7f539d008e45255725daef8553ae7162750836f279570813a',
      []
    );
  };

  /**
   * generates a mocked invalid event trigger for event verification in cardano chain with invalid toChain
   */
  static mockInvalidToChainEventTrigger = (): EventTrigger => {
    return new EventTrigger(
      'cardano',
      'erg',
      'addr_test1qzf9uxs6xgprx4zt20qtsasxut8uw6quv34xlkmd26yuk5xe70s0yf5c3sefnrft6gdajkpz29t8lsn0kcr5xqsf34qqxd6n4f',
      'ergoAddress',
      '13060',
      '250',
      '10000',
      'asset1nl0puwxmhas8fawxp8nx4e2q3wekg969n2auw3',
      '0034c44f0c7a38f833190d44125ff9b3a0dd9dbb89138160182a930bc521db95',
      '928052b80bfc23801da525a6bf8f805da36f22fa0fd5fec2198b0746eb82b72b',
      'f75fea40852ed7d7f539d008e45255725daef8553ae7162750836f279570813a',
      []
    );
  };

  /**
   * generates a mocked invalid event trigger for event verification in cardano chain with invalid fromAddress
   */
  static mockInvalidFromAddressEventTrigger = (): EventTrigger => {
    return new EventTrigger(
      'cardano',
      'ergo',
      'addr_test1vze7yqqlg8cjlyhz7jzvsg0f3fhxpuu6m3llxrajfzqecggw704re',
      'ergoAddress',
      '13060',
      '250',
      '10000',
      'asset1nl0puwxmhas8fawxp8nx4e2q3wekg969n2auw3',
      '0034c44f0c7a38f833190d44125ff9b3a0dd9dbb89138160182a930bc521db95',
      '928052b80bfc23801da525a6bf8f805da36f22fa0fd5fec2198b0746eb82b72b',
      'f75fea40852ed7d7f539d008e45255725daef8553ae7162750836f279570813a',
      []
    );
  };

  /**
   * generates a mocked invalid event trigger for event verification in cardano chain with invalid toAddress
   */
  static mockInvalidToAddressEventTrigger = (): EventTrigger => {
    return new EventTrigger(
      'cardano',
      'ergo',
      'addr_test1qzf9uxs6xgprx4zt20qtsasxut8uw6quv34xlkmd26yuk5xe70s0yf5c3sefnrft6gdajkpz29t8lsn0kcr5xqsf34qqxd6n4f',
      'ergoAddressFake',
      '13060',
      '250',
      '10000',
      'asset1nl0puwxmhas8fawxp8nx4e2q3wekg969n2auw3',
      '0034c44f0c7a38f833190d44125ff9b3a0dd9dbb89138160182a930bc521db95',
      '928052b80bfc23801da525a6bf8f805da36f22fa0fd5fec2198b0746eb82b72b',
      'f75fea40852ed7d7f539d008e45255725daef8553ae7162750836f279570813a',
      []
    );
  };

  /**
   * generates a mocked invalid event trigger for event verification in cardano chain with invalid amount
   */
  static mockInvalidAmountEventTrigger = (): EventTrigger => {
    return new EventTrigger(
      'cardano',
      'ergo',
      'addr_test1qzf9uxs6xgprx4zt20qtsasxut8uw6quv34xlkmd26yuk5xe70s0yf5c3sefnrft6gdajkpz29t8lsn0kcr5xqsf34qqxd6n4f',
      'ergoAddress',
      '13',
      '250',
      '10000',
      'asset1nl0puwxmhas8fawxp8nx4e2q3wekg969n2auw3',
      '0034c44f0c7a38f833190d44125ff9b3a0dd9dbb89138160182a930bc521db95',
      '928052b80bfc23801da525a6bf8f805da36f22fa0fd5fec2198b0746eb82b72b',
      'f75fea40852ed7d7f539d008e45255725daef8553ae7162750836f279570813a',
      []
    );
  };

  /**
   * generates a mocked invalid event trigger for event verification in cardano chain with invalid bridge fee
   */
  static mockInvalidBridgeFeeEventTrigger = (): EventTrigger => {
    return new EventTrigger(
      'cardano',
      'ergo',
      'addr_test1qzf9uxs6xgprx4zt20qtsasxut8uw6quv34xlkmd26yuk5xe70s0yf5c3sefnrft6gdajkpz29t8lsn0kcr5xqsf34qqxd6n4f',
      'ergoAddress',
      '13060',
      '25',
      '10000',
      'asset1nl0puwxmhas8fawxp8nx4e2q3wekg969n2auw3',
      '0034c44f0c7a38f833190d44125ff9b3a0dd9dbb89138160182a930bc521db95',
      '928052b80bfc23801da525a6bf8f805da36f22fa0fd5fec2198b0746eb82b72b',
      'f75fea40852ed7d7f539d008e45255725daef8553ae7162750836f279570813a',
      []
    );
  };

  /**
   * generates a mocked invalid event trigger for event verification in cardano chain with invalid network fee
   */
  static mockInvalidNetworkFeeEventTrigger = (): EventTrigger => {
    return new EventTrigger(
      'cardano',
      'ergo',
      'addr_test1qzf9uxs6xgprx4zt20qtsasxut8uw6quv34xlkmd26yuk5xe70s0yf5c3sefnrft6gdajkpz29t8lsn0kcr5xqsf34qqxd6n4f',
      'ergoAddress',
      '13060',
      '250',
      '1000',
      'asset1nl0puwxmhas8fawxp8nx4e2q3wekg969n2auw3',
      '0034c44f0c7a38f833190d44125ff9b3a0dd9dbb89138160182a930bc521db95',
      '928052b80bfc23801da525a6bf8f805da36f22fa0fd5fec2198b0746eb82b72b',
      'f75fea40852ed7d7f539d008e45255725daef8553ae7162750836f279570813a',
      []
    );
  };

  /**
   * generates a mocked invalid event trigger for event verification in cardano chain with invalid source token
   */
  static mockInvalidSourceTokenEventTrigger = (): EventTrigger => {
    return new EventTrigger(
      'cardano',
      'ergo',
      'addr_test1qzf9uxs6xgprx4zt20qtsasxut8uw6quv34xlkmd26yuk5xe70s0yf5c3sefnrft6gdajkpz29t8lsn0kcr5xqsf34qqxd6n4f',
      'ergoAddress',
      '13060',
      '250',
      '10000',
      'asset1nl0puwxmhas8fawxp8nx4e2q3wekg969n2auw4',
      '0034c44f0c7a38f833190d44125ff9b3a0dd9dbb89138160182a930bc521db95',
      '928052b80bfc23801da525a6bf8f805da36f22fa0fd5fec2198b0746eb82b72b',
      'f75fea40852ed7d7f539d008e45255725daef8553ae7162750836f279570813a',
      []
    );
  };

  /**
   * generates a mocked invalid event trigger for event verification in cardano chain with invalid target token
   */
  static mockInvalidTargetTokenEventTrigger = (): EventTrigger => {
    return new EventTrigger(
      'cardano',
      'ergo',
      'addr_test1qzf9uxs6xgprx4zt20qtsasxut8uw6quv34xlkmd26yuk5xe70s0yf5c3sefnrft6gdajkpz29t8lsn0kcr5xqsf34qqxd6n4f',
      'ergoAddress',
      '13060',
      '250',
      '10000',
      'asset1nl0puwxmhas8fawxp8nx4e2q3wekg969n2auw3',
      '1034c44f0c7a38f833190d44125ff9b3a0dd9dbb89138160182a930bc521db95',
      '928052b80bfc23801da525a6bf8f805da36f22fa0fd5fec2198b0746eb82b72b',
      'f75fea40852ed7d7f539d008e45255725daef8553ae7162750836f279570813a',
      []
    );
  };

  /**
   * generates a mocked invalid event trigger for event verification in cardano chain with invalid source tx
   */
  static mockInvalidSourceTxEventTrigger = (): EventTrigger => {
    return new EventTrigger(
      'cardano',
      'ergo',
      'addr_test1qzf9uxs6xgprx4zt20qtsasxut8uw6quv34xlkmd26yuk5xe70s0yf5c3sefnrft6gdajkpz29t8lsn0kcr5xqsf34qqxd6n4f',
      'ergoAddress',
      '13060',
      '250',
      '10000',
      'asset1nl0puwxmhas8fawxp8nx4e2q3wekg969n2auw3',
      '0034c44f0c7a38f833190d44125ff9b3a0dd9dbb89138160182a930bc521db95',
      '0f32ad374daefdce563e3391effc4fc42eb0e74bbec8afe16a46eeea69e3b2aa',
      'f75fea40852ed7d7f539d008e45255725daef8553ae7162750836f279570813a',
      []
    );
  };

  /**
   * generates a mocked invalid event trigger for event verification in cardano chain with invalid block
   */
  static mockInvalidBlockEventTrigger = (): EventTrigger => {
    return new EventTrigger(
      'cardano',
      'ergo',
      'addr_test1qzf9uxs6xgprx4zt20qtsasxut8uw6quv34xlkmd26yuk5xe70s0yf5c3sefnrft6gdajkpz29t8lsn0kcr5xqsf34qqxd6n4f',
      'ergoAddress',
      '13060',
      '250',
      '10000',
      'asset1nl0puwxmhas8fawxp8nx4e2q3wekg969n2auw3',
      '0034c44f0c7a38f833190d44125ff9b3a0dd9dbb89138160182a930bc521db95',
      '928052b80bfc23801da525a6bf8f805da36f22fa0fd5fec2198b0746eb82b72b',
      '03395496d590ec6db0f2fd13a7bcf91e82a9f230ef677f6216ea8c9f57df6ab3',
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
        },
        {
          policy_id: 'ace7bcc2ce705679149746620de3a84660ce57573df54b5a096e39a2',
          asset_name: '7369676d61',
          quantity: '50',
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

    return [box1, box2, box3, box4, box5, box6, box7, box8];
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

    const paymentAssetUnit =
      CardanoUtils.getAssetPolicyAndNameFromConfigFingerPrintMap(
        event.targetChainTokenId
      );
    const paymentAssetPolicyId: ScriptHash = ScriptHash.from_bytes(
      paymentAssetUnit[0]
    );
    const paymentAssetAssetName: AssetName = AssetName.new(paymentAssetUnit[1]);
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

    const paymentAssetUnit =
      CardanoUtils.getAssetPolicyAndNameFromConfigFingerPrintMap(
        event.targetChainTokenId
      );
    const paymentAssetPolicyId: ScriptHash = ScriptHash.from_bytes(
      paymentAssetUnit[0]
    );
    const paymentAssetAssetName: AssetName = AssetName.new(paymentAssetUnit[1]);
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

    const paymentAssetUnit =
      CardanoUtils.getAssetPolicyAndNameFromConfigFingerPrintMap(
        event.targetChainTokenId
      );
    const paymentAssetPolicyId: ScriptHash = ScriptHash.from_bytes(
      paymentAssetUnit[0]
    );
    const paymentAssetAssetName: AssetName = AssetName.new(paymentAssetUnit[1]);
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

    const paymentAssetUnit =
      CardanoUtils.getAssetPolicyAndNameFromConfigFingerPrintMap(
        event.targetChainTokenId
      );
    const paymentAssetPolicyId: ScriptHash = ScriptHash.from_bytes(
      paymentAssetUnit[0]
    );
    const paymentAssetAssetName: AssetName = AssetName.new(paymentAssetUnit[1]);
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
}

export default TestBoxes;
