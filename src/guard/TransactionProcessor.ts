import { dbAction } from '../db/DatabaseAction';
import { TransactionEntity } from '../db/entities/TransactionEntity';
import ChainsConstants from '../chains/ChainsConstants';
import KoiosApi from '../chains/cardano/network/KoiosApi';
import CardanoConfigs from '../chains/cardano/helpers/CardanoConfigs';
import ExplorerApi from '../chains/ergo/network/ExplorerApi';
import ErgoConfigs from '../chains/ergo/helpers/ErgoConfigs';
import BlockFrostApi from '../chains/cardano/network/BlockFrostApi';
import NodeApi from '../chains/ergo/network/NodeApi';
import ErgoTransaction from '../chains/ergo/models/ErgoTransaction';
import { ErgoBox } from 'ergo-lib-wasm-nodejs';
import CardanoTransaction from '../chains/cardano/models/CardanoTransaction';
import CardanoChain from '../chains/cardano/CardanoChain';
import ErgoChain from '../chains/ergo/ErgoChain';
import { AddressUtxos, TxUtxos } from '../chains/cardano/models/Interfaces';
import Utils from '../helpers/Utils';
import {
  EventStatus,
  PaymentTransaction,
  TransactionStatus,
  TransactionTypes,
} from '../models/Models';
import BaseChain from '../chains/BaseChains';
import { txJsonParser } from '../chains/TxJsonParser';
import { loggerFactory } from '../log/Logger';
import { ChainNotImplemented } from '../helpers/errors';
import { BlockfrostServerError } from '@blockfrost/blockfrost-js';

const logger = loggerFactory(import.meta.url);

class TransactionProcessor {
  static cardanoChain = new CardanoChain();
  static ergoChain = new ErgoChain();

  /**
   * returns chain object
   * @param chain the chain name
   */
  static getChainObject = (chain: string): BaseChain<any, any> => {
    if (chain === ChainsConstants.cardano) return this.cardanoChain;
    else if (chain === ChainsConstants.ergo) return this.ergoChain;
    else throw new ChainNotImplemented(chain);
  };

  /**
   * processes all transactions in the database
   */
  static processTransactions = async (): Promise<void> => {
    logger.info(`Processing transactions`);
    const txs = await dbAction.getActiveTransactions();
    for (const tx of txs) {
      try {
        switch (tx.status) {
          case TransactionStatus.sent: {
            await this.processSentTx(tx);
            break;
          }
          case TransactionStatus.signed: {
            await this.processSignedTx(tx);
            break;
          }
          case TransactionStatus.approved: {
            await this.processApprovedTx(tx);
            break;
          }
          case TransactionStatus.signFailed: {
            await this.processSignFailedTx(tx);
            break;
          }
        }
      } catch (e) {
        logger.warn(`An error occurred while processing tx`, {
          txId: tx.txId,
          error: e.message,
          stack: e.stack
        });
      }
    }
    logger.info('Transactions Processed', { count: txs.length });
  };

  /**
   * processes the transaction that has been sent before
   * @param tx the transaction
   */
  static processSentTx = async (tx: TransactionEntity): Promise<void> => {
    if (tx.chain === ChainsConstants.cardano) {
      await this.processCardanoTx(tx);
    } else if (tx.chain === ChainsConstants.ergo) {
      await this.processErgoTx(tx);
    } else {
      throw new ChainNotImplemented(tx.chain);
    }
  };

  /**
   * process cardano transaction
   * @param tx the transaction
   */
  static processCardanoTx = async (tx: TransactionEntity): Promise<void> => {
    const confirmation = await KoiosApi.getTxConfirmation(tx.txId);
    if (confirmation === null) {
      // check if ttl passed
      const paymentTx = CardanoTransaction.fromJson(tx.txJson);
      const cardanoTx = this.cardanoChain.deserialize(paymentTx.txBytes);
      const txTtl = cardanoTx.body().ttl();
      if (txTtl === undefined) {
        throw new Error(`For tx [${tx.txId}], TTL is undefined.`);
      }
      const currentSlot = await BlockFrostApi.currentSlot();

      if (currentSlot > txTtl!) {
        // tx is dead. reset status if enough blocks past.
        await this.resetCardanoStatus(tx);
      } else {
        // tx is still alive, checking tx inputs
        await this.processCardanoTxInputs(tx);
      }
    } else if (confirmation >= CardanoConfigs.paymentConfirmation) {
      // tx confirmed enough. proceed to next process.
      await dbAction.setTxStatus(tx.txId, TransactionStatus.completed);

      if (tx.type === TransactionTypes.payment) {
        // set event status, to start reward distribution.
        await dbAction.setEventStatusToPending(
          tx.event.id,
          EventStatus.pendingReward
        );
        logger.info('Tx is confirmed. Event is ready for reward distribution', {
          txId: tx.txId,
          eventId: tx.event.id,
        });
      } else if (tx.type === TransactionTypes.reward) {
        // set event as complete
        await dbAction.setEventStatus(tx.event.id, EventStatus.completed);
        logger.info('Tx is confirmed. Event is complete', {
          txId: tx.txId,
          eventId: tx.event.id,
        });
      } else {
        // no need to do anything about event. Just log that tx confirmed
        logger.info('Cardano coldStorage tx is confirmed', {
          txId: tx.txId,
          eventId: tx.event.id,
        });
      }
    } else {
      // tx is mined, but not enough confirmation. updating last check...
      const height = await BlockFrostApi.currentHeight();
      await dbAction.updateTxLastCheck(tx.txId, height);
      logger.info('Tx is in confirmation process', {
        txId: tx.txId,
        requiredConfirmation: CardanoConfigs.paymentConfirmation,
        confirmation: confirmation,
      });
    }
  };

  /**
   * process ergo transaction
   * @param tx the transaction
   */
  static processErgoTx = async (tx: TransactionEntity): Promise<void> => {
    const confirmation = await ExplorerApi.getTxConfirmation(tx.txId);
    if (confirmation >= ErgoConfigs.distributionConfirmation) {
      // tx confirmed enough. event is done.
      await dbAction.setTxStatus(tx.txId, TransactionStatus.completed);
      if (tx.type != TransactionTypes.coldStorage) {
        await dbAction.setEventStatus(tx.event.id, EventStatus.completed);
        logger.info('Tx is confirmed. Event is complete', {
          txId: tx.txId,
          eventId: tx.event.id,
        });
      } else
        logger.info('Ergo coldStorage tx is confirmed', {
          txId: tx.txId,
          eventId: tx.event.id,
        });
    } else if (confirmation === -1) {
      // tx is not mined. checking mempool...
      if (await ExplorerApi.isTxInMempool(tx.txId)) {
        // tx is in mempool. updating last check...
        const height = await NodeApi.getHeight();
        await dbAction.updateTxLastCheck(tx.txId, height);
        logger.info('Tx is in mempool', { txId: tx.txId });
      } else {
        // tx is not in mempool. checking inputs
        await this.processErgoTxInputs(tx);
      }
    } else {
      // tx is mined, but not enough confirmation. updating last check...
      const height = await NodeApi.getHeight();
      await dbAction.updateTxLastCheck(tx.txId, height);
      logger.info('Tx in confirmation process', {
        txId: tx.txId,
        requiredConfirmation: CardanoConfigs.paymentConfirmation,
        confirmation: confirmation,
      });
    }
  };

  /**
   * process cardano transaction inputs
   * @param tx the transaction
   */
  static processCardanoTxInputs = async (
    tx: TransactionEntity
  ): Promise<void> => {
    const paymentTx = CardanoTransaction.fromJson(tx.txJson);
    if (await this.isCardanoTxInputsValid(paymentTx)) {
      // tx is valid. resending...
      logger.info(
        'Cardano tx is lost but inputs are still valid. Resending tx...',
        { txId: tx.txId }
      );
      await this.cardanoChain.submitTransaction(paymentTx);
    } else {
      // tx is invalid. reset status if enough blocks past.
      await this.resetCardanoStatus(tx);
    }
  };

  /**
   * process ergo transaction inputs
   * @param tx the transaction
   */
  static processErgoTxInputs = async (tx: TransactionEntity): Promise<void> => {
    const ergoTx = ErgoTransaction.fromJson(tx.txJson);
    if (await this.isErgoTxInputsValid(ergoTx)) {
      // tx is valid. resending...
      logger.info(
        'Ergo tx is lost but inputs are still valid. Resending tx...',
        { txId: tx.txId }
      );
      await this.ergoChain.submitTransaction(ergoTx);
    } else {
      // tx is invalid. reset status if enough blocks past.
      await this.resetErgoStatus(tx);
    }
  };

  /**
   * sends request to sign tx
   * @param tx the transaction
   */
  static processApprovedTx = async (tx: TransactionEntity): Promise<void> => {
    await dbAction.txSignSemaphore.acquire().then(async (release) => {
      try {
        const paymentTx = txJsonParser(tx.txJson);
        await this.getChainObject(tx.chain).requestToSignTransaction(paymentTx);
        release();
      } catch (e) {
        logger.warn('Unexpected error occurred while sending tx to sign', {
          txId: tx.txId,
          error: e.message,
          stack: e.stack
        });
        release();
      }
    });
  };

  /**
   * submits tx to corresponding chain
   * @param tx the transaction
   */
  static processSignedTx = async (tx: TransactionEntity): Promise<void> => {
    const paymentTx = PaymentTransaction.fromJson(tx.txJson);
    await this.getChainObject(tx.chain).submitTransaction(paymentTx);
  };

  /**
   * resets status of event and set Cardano tx as invalid if enough blocks past from last check
   * @param tx the transaction
   */
  static resetCardanoStatus = async (tx: TransactionEntity): Promise<void> => {
    const height = await BlockFrostApi.currentHeight();
    if (height - tx.lastCheck >= CardanoConfigs.paymentConfirmation) {
      await dbAction.setTxStatus(tx.txId, TransactionStatus.invalid);
      if (tx.type != TransactionTypes.coldStorage) {
        await dbAction.setEventStatusToPending(
          tx.event.id,
          EventStatus.pendingPayment
        );
        logger.info('Tx is invalid. Event is now waiting for payment', {
          txId: tx.txId,
          eventId: tx.event.id,
        });
      } else
        logger.info('Cardano coldStorage tx is invalid', {
          txId: tx.txId,
          eventId: tx.event.id,
        });
    } else {
      logger.info(
        'Tx is invalid. Waiting for enough confirmation of this proposition',
        { txId: tx.txId }
      );
    }
  };

  /**
   * resets status of event and set Ergo tx as invalid if enough blocks past from last check
   * @param tx the transaction
   */
  static resetErgoStatus = async (tx: TransactionEntity): Promise<void> => {
    const height = await NodeApi.getHeight();
    if (height - tx.lastCheck >= ErgoConfigs.distributionConfirmation) {
      await dbAction.setTxStatus(tx.txId, TransactionStatus.invalid);
      if (tx.type === TransactionTypes.payment) {
        await dbAction.setEventStatusToPending(
          tx.event.id,
          EventStatus.pendingPayment
        );
        logger.info('Tx is invalid. Event is now waiting for payment', {
          txId: tx.txId,
          eventId: tx.event.id,
        });
      } else if (tx.type === TransactionTypes.reward) {
        await dbAction.setEventStatusToPending(
          tx.event.id,
          EventStatus.pendingReward
        );
        logger.info(
          'Tx is invalid. Event is now waiting for reward distribution',
          {
            txId: tx.txId,
            eventId: tx.event.id,
          }
        );
      } else
        logger.info('Ergo coldStorage tx is invalid', {
          txId: tx.txId,
          eventId: tx.event.id,
        });
    } else {
      logger.info(
        'Tx is invalid. Waiting for enough confirmation of this proposition',
        { txId: tx.txId }
      );
    }
  };

  /**
   * checks if all inputs of the transaction is still unspent and valid
   * @param paymentTx
   */
  static isCardanoTxInputsValid = async (
    paymentTx: PaymentTransaction
  ): Promise<boolean> => {
    const boxes = this.cardanoChain
      .deserialize(paymentTx.txBytes)
      .body()
      .inputs();

    const sourceTxs: Map<string, TxUtxos> = new Map();
    const addressUtxos: Map<string, AddressUtxos> = new Map();

    let valid = true;
    for (let i = 0; i < boxes.len(); i++) {
      const box = boxes.get(i);
      const sourceTxId = Utils.Uint8ArrayToHexString(
        box.transaction_id().to_bytes()
      );
      if (!sourceTxs.has(sourceTxId)) {
        try {
          const txUtxos = await BlockFrostApi.getTxUtxos(sourceTxId);
          sourceTxs.set(sourceTxId, txUtxos);
        } catch (e) {
          if (e instanceof BlockfrostServerError && e.status_code === 404) {
            logger.warn(`An error occurred while fetching tx`, {
              txId: sourceTxId,
              error: e.message,
              stack: e.stack
            });
            return false;
          } else {
            throw e;
          }
        }
      }

      const address = sourceTxs.get(sourceTxId)!.outputs[box.index()].address;
      if (!addressUtxos.has(address)) {
        const utxos = await BlockFrostApi.getAddressUtxos(address);
        addressUtxos.set(address, utxos);
      }

      const utxo = addressUtxos
        .get(address)!
        .find(
          (utxo) =>
            utxo.tx_hash === sourceTxId && utxo.output_index === box.index()
        );
      valid = valid && utxo !== undefined;
    }
    return valid;
  };

  /**
   * checks if all inputs of the transaction is still unspent and valid
   * @param ergoTx
   */
  static isErgoTxInputsValid = async (
    ergoTx: ErgoTransaction
  ): Promise<boolean> => {
    const boxes = ergoTx.inputBoxes.map((boxBytes) =>
      ErgoBox.sigma_parse_bytes(boxBytes)
    );
    let valid = true;
    for (const box of boxes) {
      valid =
        valid &&
        (await ExplorerApi.isBoxUnspentAndValid(box.box_id().to_str()));
    }
    return valid;
  };

  /**
   * set tx as invalid if at least one input is invalid
   * @param tx the transaction
   */
  static processSignFailedTx = async (tx: TransactionEntity): Promise<void> => {
    if (tx.chain === ChainsConstants.cardano) {
      const confirmation = await KoiosApi.getTxConfirmation(tx.txId);
      if (confirmation === null) {
        const paymentTx = PaymentTransaction.fromJson(tx.txJson);
        if (await this.isCardanoTxInputsValid(paymentTx)) {
          // tx is valid. resending to sign...
          logger.info(`Resending Cardano tx to sign process`, {
            txId: tx.txId,
          });
          await this.processApprovedTx(tx);
        } else {
          // tx is invalid. reset status if enough blocks past.
          await this.resetCardanoStatus(tx);
        }
      } else {
        // tx found in network. set status as sent
        logger.info(`Cardano tx found in blockchain. Updating status to sent`, {
          txId: tx.txId,
        });
        await dbAction.setTxStatus(tx.txId, TransactionStatus.sent);
      }
    } else if (tx.chain === ChainsConstants.ergo) {
      const confirmation = await ExplorerApi.getTxConfirmation(tx.txId);
      if (confirmation === -1 && !(await ExplorerApi.isTxInMempool(tx.txId))) {
        const ergoTx = ErgoTransaction.fromJson(tx.txJson);
        if (await this.isErgoTxInputsValid(ergoTx)) {
          // tx is valid. resending to sign...
          logger.info(`Resending Ergo tx to sign process`, { txId: tx.txId });
          await this.processApprovedTx(tx);
        } else {
          // tx is invalid. reset status if enough blocks past.
          await this.resetErgoStatus(tx);
        }
      } else {
        // tx found in network. set status as sent
        logger.info(`Ergo tx found in blockchain. Updating status to sent`, {
          txId: tx.txId,
        });
        await dbAction.setTxStatus(tx.txId, TransactionStatus.sent);
      }
    } else {
      throw new ChainNotImplemented(tx.chain);
    }
  };
}

export default TransactionProcessor;
