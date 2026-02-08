import { CallbackLoggerFactory } from '@rosen-bridge/callback-logger';
import {
  ImpossibleBehavior,
  TransactionType,
} from '@rosen-chains/abstract-chain';
import { ERG } from '@rosen-chains/ergo';

import Configs from '../configs/configs';
import GuardsErgoConfigs from '../configs/guardsErgoConfigs';
import { DatabaseAction } from '../db/databaseAction';
import ChainHandler from '../handlers/chainHandler';
import { RevenueType } from '../utils/constants';

const logger = CallbackLoggerFactory.getInstance().getLogger(import.meta.url);

/**
 * Fetches revenue details and stores in the database
 */
const revenueJobFunction = async () => {
  logger.info(`Processing event revenues`);
  const dbAction = DatabaseAction.getInstance();
  const ergoChain = ChainHandler.getInstance().getErgoChain();
  const currentHeight = await ergoChain.getHeight();
  const requiredConfirmation = ergoChain.getTxRequiredConfirmation(
    TransactionType.reward,
  );
  const unsavedRevenues = await dbAction.getConfirmedUnsavedRevenueEvents(
    currentHeight,
    requiredConfirmation,
  );

  for (const event of unsavedRevenues) {
    if (!event.spendTxId || !event.spendBlock)
      throw new ImpossibleBehavior(
        `Requested spent events from database, but spendTxId [${event.spendTxId}] or spendBlock [${event.spendBlock}] is invalid`,
      );

    const txId = event.spendTxId;
    const blockId = event.spendBlock;
    logger.info(`Tx [${txId}] is confirmed. Extracting it's revenues`);
    const tx = await ergoChain.getTransaction(txId, blockId);
    const order = ergoChain.extractSignedTransactionOrder(tx);

    for (const payment of order) {
      const fraudAddress = ChainHandler.getInstance()
        .getChain(event.fromChain)
        .getChainConfigs().addresses.fraud;
      let revenueType: RevenueType;
      if (payment.address == GuardsErgoConfigs.bridgeFeeRepoAddress)
        revenueType = RevenueType.bridgeFee;
      else if (payment.address == GuardsErgoConfigs.emissionAddress)
        revenueType = RevenueType.emission;
      else if (payment.address == GuardsErgoConfigs.networkFeeRepoAddress)
        revenueType = RevenueType.networkFee;
      else if (payment.address == fraudAddress) revenueType = RevenueType.fraud;
      else continue;

      // store erg revenue
      await dbAction.insertRevenue(
        ERG,
        payment.assets.nativeToken,
        txId,
        revenueType,
        event,
      );
      logger.debug(
        `inserted revenue [${ERG}] for amount [${payment.assets.nativeToken}] as type [${revenueType}] in tx [${txId}]`,
      );
      // store other tokens revenue
      for (const asset of payment.assets.tokens) {
        await dbAction.insertRevenue(
          asset.id,
          asset.value,
          txId,
          revenueType,
          event,
        );
        logger.debug(
          `inserted revenue [${asset.id}] for amount [${asset.value}] as type [${revenueType}] in tx [${txId}]`,
        );
      }
    }
  }

  logger.info(`Processed [${unsavedRevenues.length}] unsaved revenue events`);
};

/**
 * Runs the job of storing revenue details
 */
const revenueJob = async () => {
  try {
    await revenueJobFunction();
  } catch (e) {
    logger.warn(`An error occurred while extracting revenues: ${e.message}`);
    logger.warn(e.stack);
  }

  setTimeout(revenueJob, Configs.revenueUpdateInterval * 1000);
};

export { revenueJob, revenueJobFunction };
