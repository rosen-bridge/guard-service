import { ERG } from '@rosen-chains/ergo';
import Configs from '../../src/configs/Configs';
import { DatabaseAction } from '../../src/db/DatabaseAction';
import { loggerFactory } from '../../src/log/Logger';
import TransactionSerializer from '../transaction/TransactionSerializer';
import GuardsErgoConfigs from '../../src/configs/GuardsErgoConfigs';
import ChainHandler from '../../src/handlers/ChainHandler';

const logger = loggerFactory(import.meta.url);

/**
 * Fetches revenue details and stores in the database
 */
export const revenueJobFunction = async () => {
  const dbAction = DatabaseAction.getInstance();
  const unsavedRevenues = await dbAction.getUnsavedRevenueIds();
  if (unsavedRevenues.length === 0) {
    return;
  }
  const newTxs = await dbAction.getTxsById(unsavedRevenues);
  logger.debug(`Revenue Job: [${newTxs.length}] new rewards found`);
  // store reward tx info
  for (const tx of newTxs) {
    const rewardTx = TransactionSerializer.fromJson(tx.txJson);
    const payments = ChainHandler.getInstance()
      .getErgoChain()
      .extractTransactionOrder(rewardTx);

    // save tokens as revenues
    for (const payment of payments) {
      if (payment.address == GuardsErgoConfigs.bridgeFeeRepoAddress) {
        // store erg revenue
        await dbAction.storeRevenue(
          ERG,
          payment.assets.nativeToken.toString(),
          tx
        );
        // store other tokens revenue
        for (const asset of payment.assets.tokens)
          await dbAction.storeRevenue(asset.id, asset.value.toString(), tx);
      }
    }
  }
};

/**
 * Runs the job of storing revenue details
 */
export const revenueJob = async () => {
  try {
    await revenueJobFunction();
  } catch (e) {
    logger.warn(`Revenue Job failed with error: ${e.message} - ${e.stack}`);
  }

  setTimeout(revenueJob, Configs.revenueUpdateInterval * 1000);
};
