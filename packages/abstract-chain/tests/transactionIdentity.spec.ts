import {
  PaymentTransaction,
  TransactionType,
  ConfirmationStatus,
} from '../lib';
import TestChainNetwork from './network/testChainNetwork';
import { generateChainObject } from './testUtils';

describe('persisted transaction identity context', () => {
  const transaction = (network = 'test', txId = 'approval-id') =>
    new PaymentTransaction(
      network,
      txId,
      'event-id',
      Buffer.from(''),
      TransactionType.payment,
    );

  it('preserves existing confirmation lookup when context matches', async () => {
    const network = new TestChainNetwork();
    const chain = generateChainObject(network);
    const confirmation = vi
      .spyOn(network, 'getTxConfirmation')
      .mockResolvedValue(100);
    const actualId = vi.spyOn(network, 'getActualTxId');
    expect(
      await chain.getTxConfirmationStatus(
        'approval-id',
        TransactionType.payment,
        transaction(),
      ),
    ).toBe(ConfirmationStatus.ConfirmedEnough);
    expect(confirmation).toHaveBeenCalledWith('approval-id');
    expect(actualId).not.toHaveBeenCalled();
  });

  it.each([
    ['different approval', transaction('test', 'other-id')],
    ['different network', transaction('other-chain')],
  ])(
    'rejects %s before network confirmation or identity lookup',
    async (_, context) => {
      const network = new TestChainNetwork();
      const chain = generateChainObject(network);
      const confirmation = vi.spyOn(network, 'getTxConfirmation');
      const actualId = vi.spyOn(network, 'getActualTxId');
      await expect(
        chain.getTxConfirmationStatus(
          'approval-id',
          TransactionType.payment,
          context,
        ),
      ).rejects.toThrow('identity context');
      expect(() => chain.getActualTxId('approval-id', context)).toThrow(
        'identity context',
      );
      expect(confirmation).not.toHaveBeenCalled();
      expect(actualId).not.toHaveBeenCalled();
    },
  );
});
