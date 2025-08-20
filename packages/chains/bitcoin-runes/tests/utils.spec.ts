import { Psbt } from 'bitcoinjs-lib';
import { BitcoinRunesTransaction, BitcoinRunesUtxo } from '../lib';
import {
  generateFeeEstimatorWithPsbt,
  splitPaymentOrders,
  sumBitcoinRunesUtxosBalance,
} from '../lib/utils';
import * as testData from './testData';

describe('generateFeeEstimatorWithPsbt', () => {
  const generateMockedArray = (length: number) =>
    Array.from({ length }, () => ({})) as unknown as BitcoinRunesUtxo[];

  /**
   * @target generateFeeEstimatorWithPsbt should generate fee estimator
   * that successfully estimates fee for PSBT targeted to taproot addresses
   * @dependencies
   * @scenario
   * - mock PaymentTransaction
   * - calculate vSize of the signed version of mocked PaymentTransaction
   * - run test
   *   - generate fee estimator with mocked psbt and fee ratio 1
   *   - call estimate fee with mocked psbt info (input count, change box count, opReturn script length)
   * - check returned value
   * @expected
   * - it should return the psbt vSize
   */
  it('should generate fee estimator that successfully estimates fee for PSBT targeted to taproot addresses', async () => {
    // mock PaymentTransaction
    const paymentTx = BitcoinRunesTransaction.fromJson(
      testData.transaction1PaymentTransaction
    );
    const psbt = Psbt.fromBuffer(Buffer.from(paymentTx.txBytes));

    // calculate vSize of the signed version of mocked PaymentTransaction
    const signedTx = Psbt.fromHex(
      testData.transaction1SignedTxBytesHex
    ).extractTransaction();
    const vSize = signedTx.virtualSize();

    // run test
    const estimateFee = generateFeeEstimatorWithPsbt(psbt, 1);
    const result = estimateFee(generateMockedArray(1), 0);

    // check returned value
    expect(result).toEqual(BigInt(vSize));
  });

  /**
   * @target generateFeeEstimatorWithPsbt should generate fee estimator
   * that successfully estimates fee for PSBT targeted to native segwit
   * addresses
   * @dependencies
   * @scenario
   * - mock PaymentTransaction
   * - calculate vSize of the signed version of mocked PaymentTransaction
   * - run test
   *   - generate fee estimator with mocked psbt and fee ratio 1
   *   - call estimate fee with mocked psbt info (input count, change box count, opReturn script length)
   * - check returned value
   * @expected
   * - it should return the psbt vSize
   */
  it('should generate fee estimator that successfully estimates fee for PSBT targeted to native segwit addresses', async () => {
    // mock PaymentTransaction
    const paymentTx = BitcoinRunesTransaction.fromJson(
      testData.transaction2Forms.generatePaymentTxString(
        testData.transaction2Forms.txData.valid
      )
    );
    const psbt = Psbt.fromBuffer(Buffer.from(paymentTx.txBytes));

    // calculate vSize of the signed version of mocked PaymentTransaction
    const signedTx = Psbt.fromHex(
      testData.transaction2SignedTxBytesHex
    ).extractTransaction();
    const vSize = signedTx.virtualSize();

    // run test
    const estimateFee = generateFeeEstimatorWithPsbt(psbt, 1);
    const result = estimateFee(generateMockedArray(2), 0);

    // check returned value
    expect(result).toEqual(BigInt(vSize));
  });
});

describe('splitPaymentOrders', () => {
  const minimumNativeToken = 330n;

  /**
   * @target splitPaymentOrders should return the same order when it
   * does not require splitting
   * @dependencies
   * @scenario
   * - run test
   * - check returned value
   * @expected
   * - it should return the same order
   */
  it('should return the same order when it does not require splitting', () => {
    const result = splitPaymentOrders(
      testData.transaction1Order,
      minimumNativeToken
    );
    expect(result).toEqual(testData.transaction1Order);
  });

  /**
   * @target splitPaymentOrders should successfully split the order
   * @dependencies
   * @scenario
   * - run test
   * - check returned value
   * @expected
   * - it should return an order with each item having exactly one token
   */
  it('should successfully split the order', () => {
    const result = splitPaymentOrders(
      testData.mockedColdOrder,
      minimumNativeToken
    );
    expect(result).toEqual(testData.splittedColdOrder);
  });

  /**
   * @target splitPaymentOrders should not mutate the order
   * @dependencies
   * @scenario
   * - run test
   * - check the order
   * @expected
   * - it should remain the same
   */
  it('should not mutate the order', () => {
    const order = structuredClone(testData.mockedColdOrder);
    splitPaymentOrders(order, minimumNativeToken);
    expect(order).toEqual(testData.mockedColdOrder);
  });

  /**
   * @target splitPaymentOrders should throw error when at least one
   * item of the order has no token
   * @dependencies
   * @scenario
   * - run test & check throw exception
   * @expected
   * - it should simply throw an Error
   */
  it('should throw error when at least one item of the order has no token', () => {
    const invalidOrder = [
      ...testData.mockedColdOrder,
      {
        address:
          'bc1p0dwlr8z5w3gyf8h20edpc4ce0wlvupmplzt3vcawpn53ce0d5mzsty8deu',
        assets: {
          nativeToken: 330n,
          tokens: [],
        },
      },
    ];
    expect(() => splitPaymentOrders(invalidOrder, minimumNativeToken)).toThrow(
      Error
    );
  });
});

describe('sumBitcoinRunesUtxosBalance', () => {
  /**
   * @target sumBitcoinRunesUtxosBalance should sum the balance of a
   * list of BitcoinRunesUtxo successfully
   * @dependencies
   * @scenario
   * - run test
   * - check returned value
   * @expected
   * - it should return the sum of the balance of the utxos
   */
  it('should sum the balance of a list of BitcoinRunesUtxo successfully', () => {
    const result = sumBitcoinRunesUtxosBalance(testData.lockAddressUtxos);
    expect(result).toEqual(testData.lockBalance);
  });
});
