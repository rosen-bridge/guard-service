import {
  BlockFrostAPI,
  BlockfrostClientError,
  BlockfrostServerError,
} from '@blockfrost/blockfrost-js';
import { components } from '@blockfrost/openapi';
import { Transaction } from '@emurgo/cardano-serialization-lib-nodejs';

import { AbstractLogger } from '@rosen-bridge/abstract-logger';
import JsonBigInt from '@rosen-bridge/json-bigint';
import {
  AssetBalance,
  BlockInfo,
  FailedError,
  ImpossibleBehavior,
  NetworkError,
  TokenDetail,
  TokenInfo,
  UnexpectedApiError,
} from '@rosen-chains/abstract-chain';
import { UNKNOWN_TOKEN } from '@rosen-chains/abstract-chain';
import {
  AbstractCardanoNetwork,
  CardanoUtxo,
  CardanoTx,
  CardanoAsset,
  CardanoBoxCandidate,
  CardanoProtocolParameters,
  CardanoMetadata,
  CardanoUtils,
  CardanoTxInput,
} from '@rosen-chains/cardano';

import { PAGE_ITEM_COUNT } from './constants';
import {
  BlockFrostAsset,
  PartialBlockFrostInput,
  BlockFrostNullValueError,
  BlockFrostOutput,
  BlockFrostTxMetadata,
  CardanoBalance,
  BlockFrostAddressUtxos,
} from './types';

class CardanoBlockFrostNetwork extends AbstractCardanoNetwork {
  protected client: BlockFrostAPI;

  constructor(
    projectId: string,
    blockFrostUrl?: string,
    logger?: AbstractLogger,
  ) {
    super(logger);
    this.client = new BlockFrostAPI({
      projectId: projectId,
      customBackend: blockFrostUrl,
      network: 'mainnet',
    });
  }

  /**
   * gets the blockchain height
   * @returns the blockchain height
   */
  getHeight = async (): Promise<number> => {
    return this.client
      .blocksLatest()
      .then((block) => {
        this.logger.debug(
          `requested 'blocksLatest'. res: ${JsonBigInt.stringify(block)}`,
        );
        const height = block.height;
        if (height) return height;
        throw new BlockFrostNullValueError('Height of last block is null');
      })
      .catch((e) => {
        const baseError = `Failed to fetch current height from BlockFrost: `;
        if (e instanceof BlockfrostClientError) {
          throw new NetworkError(baseError + e.message);
        } else {
          throw new UnexpectedApiError(baseError + e.message);
        }
      });
  };

  /**
   * gets confirmation for a transaction (returns -1 if tx is not mined or found)
   * @param transactionId the transaction id
   * @returns the transaction confirmation
   */
  getTxConfirmation = async (transactionId: string): Promise<number> => {
    const currentHeight = await this.getHeight();
    let txHeight = -1;
    try {
      const txInfo = await this.client.txs(transactionId);
      this.logger.debug(
        `requested 'txs' for txId [${transactionId}]. res: ${JsonBigInt.stringify(
          txInfo,
        )}`,
      );
      txHeight = txInfo.block_height;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (e: any) {
      const baseError = `Failed to get confirmation for tx [${transactionId}] from BlockFrost: `;
      if (e instanceof BlockfrostServerError && e.status_code === 404) {
        this.logger.debug(baseError + `Transaction is not found`);
      } else if (e instanceof BlockfrostClientError) {
        throw new NetworkError(baseError + e.message);
      } else {
        throw new UnexpectedApiError(baseError + e.message);
      }
    }
    if (txHeight === -1) return txHeight;
    return currentHeight - txHeight;
  };

  /**
   * gets the amount of each asset in an address
   * @param address the address
   * @returns an object containing the amount of each asset
   */
  getAddressAssets = async (address: string): Promise<AssetBalance> => {
    let nativeToken = 0n;
    const tokens: Array<TokenInfo> = [];

    return this.client
      .addresses(address)
      .then((res) => {
        this.logger.debug(
          `requested 'addresses' for address [${address}]. res: ${JsonBigInt.stringify(
            res,
          )}`,
        );
        const assets = res.amount;
        // get ADA value
        const lovelaceAmount = assets.find(
          (token) => token.unit === 'lovelace',
        )?.quantity;
        if (!lovelaceAmount)
          throw new BlockFrostNullValueError(
            `Found assets for address without lovelace`,
          );
        nativeToken = BigInt(lovelaceAmount);
        // get tokens value
        assets.forEach((asset) => {
          if (asset.unit === 'lovelace') return;
          const policyId = asset.unit.slice(0, 56);
          const assetName = asset.unit.slice(56);
          tokens.push({
            id: CardanoUtils.generateAssetId(policyId, assetName),
            value: BigInt(asset.quantity),
          });
        });
        return { nativeToken, tokens };
      })
      .catch((e) => {
        const baseError = `Failed to get address [${address}] assets from BlockFrost: `;
        if (e instanceof BlockfrostServerError && e.status_code === 404) {
          return { nativeToken, tokens };
        } else if (e instanceof BlockfrostClientError) {
          throw new NetworkError(baseError + e.message);
        } else {
          throw new UnexpectedApiError(baseError + e.message);
        }
      });
  };

  /**
   * gets id of all transactions in the given block
   * @param blockId the block id
   * @returns list of the transaction ids in the block
   */
  getBlockTransactionIds = (blockId: string): Promise<Array<string>> => {
    return this.client
      .blocksTxsAll(blockId)
      .then((res) => {
        this.logger.debug(
          `requested 'blocksTxsAll' for blockId [${blockId}]. res: ${JsonBigInt.stringify(
            res,
          )}`,
        );
        return res;
      })
      .catch((e) => {
        const baseError = `Failed to get block [${blockId}] transaction ids from BlockFrost: `;
        if (e instanceof BlockfrostServerError && e.status_code === 404) {
          throw new FailedError(baseError + e.message);
        } else if (e instanceof BlockfrostClientError) {
          throw new NetworkError(baseError + e.message);
        } else {
          throw new UnexpectedApiError(baseError + e.message);
        }
      });
  };

  /**
   * gets info of the given block
   * @param blockId the block id
   * @returns an object containing block info
   */
  getBlockInfo = (blockId: string): Promise<BlockInfo> => {
    return this.client
      .blocks(blockId)
      .then((res) => {
        this.logger.debug(
          `requested 'blocks' for blockId [${blockId}]. res: ${JsonBigInt.stringify(
            res,
          )}`,
        );
        if (!res.previous_block || !res.height)
          throw new BlockFrostNullValueError(
            'Height or previous block of the requested block is null',
          );
        return {
          hash: res.hash,
          parentHash: res.previous_block,
          height: res.height,
        };
      })
      .catch((e) => {
        const baseError = `Failed to get block [${blockId}] transaction ids from BlockFrost: `;
        if (e instanceof BlockfrostServerError && e.status_code === 404) {
          throw new FailedError(baseError + e.message);
        } else if (e instanceof BlockfrostClientError) {
          throw new NetworkError(baseError + e.message);
        } else {
          throw new UnexpectedApiError(baseError + e.message);
        }
      });
  };

  /**
   * gets a transaction (serialized in `CardanoTx` format)
   * @param transactionId the transaction id
   * @param blockId the block id
   * @returns the transaction
   */
  getTransaction = async (
    transactionId: string,
    blockId: string,
  ): Promise<CardanoTx> => {
    let txInfo: components['schemas']['tx_content'];
    try {
      txInfo = await this.client.txs(transactionId);
      this.logger.debug(
        `requested 'txs' for txId [${transactionId}]. res: ${JsonBigInt.stringify(
          txInfo,
        )}`,
      );
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (e: any) {
      const baseError = `Failed to get transaction [${transactionId}] from BlockFrost: `;
      if (e instanceof BlockfrostServerError && e.status_code === 404) {
        throw new FailedError(baseError + e.message);
      } else if (e instanceof BlockfrostClientError) {
        throw new NetworkError(baseError + e.message);
      } else {
        throw new UnexpectedApiError(baseError + e.message);
      }
    }

    let txUtxos: components['schemas']['tx_content_utxo'];
    try {
      txUtxos = await this.client.txsUtxos(transactionId);
      this.logger.debug(
        `requested 'txsUtxos' for txId [${transactionId}]. res: ${JsonBigInt.stringify(
          txUtxos,
        )}`,
      );
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (e: any) {
      const baseError = `Failed to get transaction [${transactionId}] utxos from BlockFrost: `;
      if (e instanceof BlockfrostServerError && e.status_code === 404) {
        throw new FailedError(baseError + e.message);
      } else if (e instanceof BlockfrostClientError) {
        throw new NetworkError(baseError + e.message);
      } else {
        throw new UnexpectedApiError(baseError + e.message);
      }
    }

    let txMetadata: components['schemas']['tx_content_metadata'];
    try {
      txMetadata = await this.client.txsMetadata(transactionId);
      this.logger.debug(
        `requested 'txsMetadata' for txId [${transactionId}]. res: ${JsonBigInt.stringify(
          txMetadata,
        )}`,
      );
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (e: any) {
      const baseError = `Failed to get transaction [${transactionId}] metadata from BlockFrost: `;
      if (e instanceof BlockfrostServerError && e.status_code === 404) {
        throw new FailedError(baseError + e.message);
      } else if (e instanceof BlockfrostClientError) {
        throw new NetworkError(baseError + e.message);
      } else {
        throw new UnexpectedApiError(baseError + e.message);
      }
    }

    if (txInfo.block !== blockId)
      throw new FailedError(
        `Tx [${transactionId}] doesn't belong to block [${blockId}]`,
      );

    const tx: CardanoTx = {
      id: txInfo.hash,
      inputs: txUtxos.inputs.map(this.convertToCardanoTxInput),
      outputs: txUtxos.outputs.map(this.convertToCardanoBoxCandidate),
      fee: BigInt(txInfo.fees),
    };
    if (txMetadata.length) tx.metadata = this.parseMetadata(txMetadata);

    return tx;
  };

  /**
   * submits a transaction
   * @param transaction the transaction
   */
  submitTransaction = async (transaction: Transaction): Promise<void> => {
    await this.client.txSubmit(transaction.to_hex());
  };

  /**
   * gets all transactions in mempool (returns empty list if the chain has no mempool)
   * Note: BlockFrost does not return full data of mempool transaction. So function returns empty list
   * @returns empty list
   */
  getMempoolTransactions = async (): Promise<Array<CardanoTx>> => {
    // since BlockFrost does not return full data of mempool transactions, it returns empty list
    return [];
  };

  /**
   * gets confirmed and unspent boxes of an address
   * @param address the address
   * @param offset
   * @param limit
   * @returns list of boxes
   */
  getAddressBoxes = async (
    address: string,
    offset: number,
    limit: number,
  ): Promise<Array<CardanoUtxo>> => {
    const count = PAGE_ITEM_COUNT;
    let page = 1 + Math.floor(offset / PAGE_ITEM_COUNT);
    const firstBoxIndex = (page - 1) * PAGE_ITEM_COUNT;
    const boxes: BlockFrostAddressUtxos = [];

    while ((page - 1) * PAGE_ITEM_COUNT < offset + limit) {
      let addressUtxos: BlockFrostAddressUtxos;
      try {
        addressUtxos = await this.client.addressesUtxos(address, {
          count,
          page,
        });
        this.logger.debug(
          `requested 'addressesUtxos' for address [${address}]. res: ${JsonBigInt.stringify(
            addressUtxos,
          )}`,
        );
        boxes.push(...addressUtxos);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } catch (e: any) {
        const baseError = `Failed to get address [${address}] UTxOs from BlockFrost: `;
        if (e instanceof BlockfrostServerError && e.status_code === 404) {
          this.logger.debug(baseError + `Address has no transaction history`);
        } else if (e instanceof BlockfrostClientError) {
          throw new NetworkError(baseError + e.message);
        } else {
          throw new UnexpectedApiError(baseError + e.message);
        }
      }
      page++;
    }

    return boxes
      .slice(offset - firstBoxIndex, offset - firstBoxIndex + limit)
      .map(this.convertToCardanoUTxO);
  };

  /**
   * checks if a box is still unspent and valid
   * @param boxId the box id (txId + . + index)
   * @returns true if the box is unspent and valid
   */
  isBoxUnspentAndValid = async (boxId: string): Promise<boolean> => {
    const [txId, index] = boxId.split('.');

    let txUtxos: components['schemas']['tx_content_utxo'];
    try {
      txUtxos = await this.client.txsUtxos(txId);
      this.logger.debug(
        `requested 'txsUtxos' for txId [${txId}]. res: ${JsonBigInt.stringify(
          txUtxos,
        )}`,
      );
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (e: any) {
      const baseError = `Failed to get transaction [${txId}] utxos from BlockFrost: `;
      if (e instanceof BlockfrostServerError && e.status_code === 404) {
        this.logger.debug(
          `Utxo [${boxId}] is invalid: Transaction [${txId}] is not found`,
        );
        return false;
      } else if (e instanceof BlockfrostClientError) {
        throw new NetworkError(baseError + e.message);
      } else {
        throw new UnexpectedApiError(baseError + e.message);
      }
    }
    if (txUtxos.outputs.length <= Number(index)) {
      this.logger.debug(
        `Utxo [${boxId}] is invalid: Transaction [${txId}] doesn't have index [${index}]`,
      );
      return false;
    }
    const address = txUtxos.outputs[Number(index)].address;
    let addressUtxos: BlockFrostAddressUtxos;
    try {
      addressUtxos = await this.client.addressesUtxosAll(address);
      this.logger.debug(
        `requested 'addressesUtxosAll' for address [${address}]. res: ${JsonBigInt.stringify(
          addressUtxos,
        )}`,
      );
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (e: any) {
      const baseError = `Failed to get address [${address}] UTxOs from BlockFrost: `;
      if (e instanceof BlockfrostServerError && e.status_code === 404) {
        throw new ImpossibleBehavior(
          `Found box [${boxId}] for address [${address}] with no transaction history`,
        );
      } else if (e instanceof BlockfrostClientError) {
        throw new NetworkError(baseError + e.message);
      } else {
        throw new UnexpectedApiError(baseError + e.message);
      }
    }
    const box = addressUtxos.find(
      (utxo) => utxo.tx_hash === txId && utxo.output_index === Number(index),
    );

    if (box) return true;
    this.logger.debug(
      `box [${boxId}] is spent: Box was not found in address [${address}] UTxOs`,
    );
    return false;
  };

  /**
   * gets the current network slot
   * @returns the current network slot
   */
  currentSlot = async (): Promise<number> => {
    return this.client
      .blocksLatest()
      .then((block) => {
        this.logger.debug(
          `requested 'blocksLatest'. res: ${JsonBigInt.stringify(block)}`,
        );
        const slot = block.slot;
        if (slot) return Number(slot);
        throw new BlockFrostNullValueError('Slot of last block is null');
      })
      .catch((e) => {
        const baseError = `Failed to fetch current slot from BlockFrost: `;
        if (e instanceof BlockfrostClientError) {
          throw new NetworkError(baseError + e.message);
        } else {
          throw new UnexpectedApiError(baseError + e.message);
        }
      });
  };

  /**
   * gets an utxo from the network
   * @param boxId the id of Utxo (txId + . + index)
   * @returns the utxo
   */
  getUtxo = async (boxId: string): Promise<CardanoUtxo> => {
    const [txId, index] = boxId.split('.');
    const baseFailedError = `Utxo [${boxId}] is not found: `;

    let txUtxos: components['schemas']['tx_content_utxo'];
    try {
      txUtxos = await this.client.txsUtxos(txId);
      this.logger.debug(
        `requested 'txsUtxos' for txId [${txId}]. res: ${JsonBigInt.stringify(
          txUtxos,
        )}`,
      );
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (e: any) {
      const baseError = `Failed to get transaction [${txId}] utxos from BlockFrost: `;
      if (e instanceof BlockfrostServerError && e.status_code === 404) {
        throw new FailedError(
          baseFailedError + `Transaction [${txId}] is not found`,
        );
      } else if (e instanceof BlockfrostClientError) {
        throw new NetworkError(baseError + e.message);
      } else {
        throw new UnexpectedApiError(baseError + e.message);
      }
    }

    if (txUtxos.outputs.length <= Number(index)) {
      throw new FailedError(
        baseFailedError +
          `Transaction [${txId}] outputs does not have index [${index}]`,
      );
    }

    const boxCandidate = this.convertToCardanoBoxCandidate(
      txUtxos.outputs[Number(index)],
    );
    return {
      txId: txId,
      index: Number(index),
      value: boxCandidate.value,
      assets: boxCandidate.assets,
    };
  };

  /**
   * converts CardanoAssets object from BlockFrostAsset
   * @param asset BlockFrostAsset object
   * @returns CardanoAssets object
   */
  protected convertAssetList = (
    assets: Array<BlockFrostAsset>,
  ): CardanoBalance => {
    if (assets.length === 0) return { lovelace: 0n, assets: [] };

    const cardanoAssets: Array<CardanoAsset> = [];
    // get ADA value
    const loveLaceAmount = assets.find(
      (token) => token.unit === 'lovelace',
    )?.quantity;
    if (!loveLaceAmount)
      throw new BlockFrostNullValueError(`Found assets without lovelace`);
    // get tokens value
    assets.forEach((asset) => {
      if (asset.unit === 'lovelace') return;
      const policyId = asset.unit.slice(0, 56);
      const assetName = asset.unit.slice(56);
      cardanoAssets.push({
        policyId: policyId,
        assetName: assetName,
        quantity: BigInt(asset.quantity),
      });
    });

    return {
      lovelace: BigInt(loveLaceAmount),
      assets: cardanoAssets,
    };
  };

  /**
   * converts BlockFrost tx input schema to CardanoUtxo
   * @param input
   * @returns
   */
  protected convertToCardanoUTxO = (
    input: PartialBlockFrostInput,
  ): CardanoUtxo => {
    const utxoAssets = this.convertAssetList(input.amount);
    return {
      txId: input.tx_hash,
      index: Number(input.output_index),
      value: utxoAssets.lovelace,
      assets: utxoAssets.assets,
    };
  };

  /**
   * converts BlockFrost tx input schema to CardanoTxInput
   * @param input
   * @returns
   */
  protected convertToCardanoTxInput = (
    input: PartialBlockFrostInput,
  ): CardanoTxInput => {
    return {
      txId: input.tx_hash,
      index: Number(input.output_index),
    };
  };

  /**
   * converts BlockFrost tx output schema to CardanoBoxCandidate
   * @param output
   * @returns
   */
  protected convertToCardanoBoxCandidate = (
    output: BlockFrostOutput,
  ): CardanoBoxCandidate => {
    const utxoAssets = this.convertAssetList(output.amount);
    return {
      address: output.address,
      value: utxoAssets.lovelace,
      assets: utxoAssets.assets,
    };
  };

  /**
   * parses metadata object from BlockFrost tx metadata schema
   * @param output
   * @returns
   */
  protected parseMetadata = (
    metadata: BlockFrostTxMetadata,
  ): CardanoMetadata => {
    return metadata.reduce((result: CardanoMetadata, labelObject) => {
      result[labelObject.label] = labelObject.json_metadata;
      return result;
    }, {});
  };

  /**
   * gets required parameters of Cardano Protocol
   * @returns an object containing required protocol parameters
   */
  getProtocolParameters = async (): Promise<CardanoProtocolParameters> => {
    return this.client
      .epochsLatestParameters()
      .then((parameters) => {
        this.logger.debug(
          `requested 'epochsLatestParameters'. res: ${JsonBigInt.stringify(
            parameters,
          )}`,
        );
        if (!parameters.max_val_size || !parameters.coins_per_utxo_size)
          throw new BlockFrostNullValueError(
            `Some required Cardano protocol params are null`,
          );
        return {
          minFeeA: parameters.min_fee_a,
          minFeeB: parameters.min_fee_b,
          poolDeposit: parameters.pool_deposit,
          keyDeposit: parameters.key_deposit,
          maxValueSize: Number(parameters.max_val_size),
          maxTxSize: parameters.max_tx_size,
          coinsPerUtxoSize: parameters.coins_per_utxo_size,
        };
      })
      .catch((e) => {
        const baseError = `Failed to fetch current height from BlockFrost: `;
        if (e instanceof BlockfrostClientError) {
          throw new NetworkError(baseError + e.message);
        } else {
          throw new UnexpectedApiError(baseError + e.message);
        }
      });
  };

  /**
   * gets token details (name, decimals)
   * @param tokenId
   */
  getTokenDetail = async (tokenId: string): Promise<TokenDetail> => {
    const assetUnit = tokenId.split('.').join('');
    return this.client
      .assetsById(assetUnit)
      .then((res) => {
        this.logger.debug(
          `requested 'assetsById' for unit [${assetUnit}]. res: ${JsonBigInt.stringify(
            res,
          )}`,
        );
        return {
          tokenId: tokenId,
          name: res.metadata?.name ?? UNKNOWN_TOKEN,
          decimals: res.metadata?.decimals ?? 0,
        };
      })
      .catch((e) => {
        const baseError = `Failed to fetch token detail for unit [${assetUnit}] from BlockFrost: `;
        if (e instanceof BlockfrostServerError && e.status_code === 404) {
          throw new FailedError(`Token not found`);
        } else if (e instanceof BlockfrostClientError) {
          throw new NetworkError(baseError + e.message);
        } else {
          throw new UnexpectedApiError(baseError + e.message);
        }
      });
  };
}

export default CardanoBlockFrostNetwork;
