import { Psbt } from 'bitcoinjs-lib';
import { BitcoinRunesTransaction, BitcoinRunesUtxo } from '../lib';
import * as testData from './testData';
import { generateFeeEstimatorWithPsbt } from '../lib/utils';

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
    const result = estimateFee(generateMockedArray(1), 1);

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
      testData.transaction3PaymentTransaction
    );
    const psbt = Psbt.fromBuffer(Buffer.from(paymentTx.txBytes));

    // calculate vSize of the signed version of mocked PaymentTransaction
    const signedTx = Psbt.fromHex(
      testData.transaction3SignedTxBytesHex
    ).extractTransaction();
    const vSize = signedTx.virtualSize();

    // run test
    const estimateFee = generateFeeEstimatorWithPsbt(psbt, 1);
    const result = estimateFee(generateMockedArray(2), 1);

    // check returned value
    expect(result).toEqual(BigInt(vSize));
  });
});
