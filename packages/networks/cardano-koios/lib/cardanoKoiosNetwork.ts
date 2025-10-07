import {
  decode_metadatum_to_json_str,
  FixedTransaction,
  GeneralTransactionMetadata,
  MetadataJsonSchema,
  MultiAsset,
  Transaction,
  TransactionInput,
  TransactionOutput,
} from '@emurgo/cardano-serialization-lib-nodejs';
import { AbstractLogger } from '@rosen-bridge/abstract-logger';
import JsonBigInt from '@rosen-bridge/json-bigint';
import {
  AssetBalance,
  BlockInfo,
  FailedError,
  NetworkError,
  TokenDetail,
  TokenInfo,
  UNKNOWN_TOKEN,
  UnexpectedApiError,
} from '@rosen-chains/abstract-chain';
import {
  AbstractCardanoNetwork,
  CardanoUtxo,
  CardanoTx,
  CardanoAsset,
  CardanoProtocolParameters,
  CardanoUtils,
  CardanoMetadata,
  CardanoTxInput,
  CardanoBoxCandidate,
} from '@rosen-chains/cardano';
import cardanoKoiosClientFactory, {
  AddressAssets,
  AddressInfo,
  AssetInfo,
} from '@rosen-clients/cardano-koios';
import {
  TxInfoItemInputsItem,
  TxInfoItemInputsItemAssetListAnyOfItem,
} from '@rosen-clients/cardano-koios';

import { KoiosNullValueError } from './types';

class CardanoKoiosNetwork extends AbstractCardanoNetwork {
  private client: ReturnType<typeof cardanoKoiosClientFactory>;

  constructor(koiosUrl: string, authToken?: string, logger?: AbstractLogger) {
    super(logger);
    this.client = cardanoKoiosClientFactory(koiosUrl, authToken);
  }

  /**
   * gets the blockchain height
   * @returns the blockchain height
   */
  getHeight = async (): Promise<number> => {
    return this.client
      .tip()
      .then((block) => {
        this.logger.debug(
          `requested 'tip'. res: ${JsonBigInt.stringify(block)}`,
        );
        const height = block[0].block_no;
        if (height) return Number(height);
        throw new KoiosNullValueError('Height of last block is null');
      })
      .catch((e) => {
        const baseError = `Failed to fetch current height from Koios: `;
        if (e.response) {
          throw new FailedError(baseError + `${e.response.data.reason}`);
        } else if (e.request) {
          throw new NetworkError(baseError + e.message);
        } else {
          throw new UnexpectedApiError(baseError + e.message);
        }
      });
  };

  /**
   * gets confirmation for a transaction
   * @param transactionId the transaction id
   * @returns the transaction confirmation
   */
  getTxConfirmation = async (transactionId: string): Promise<number> => {
    return this.client
      .txStatus({ _tx_hashes: [transactionId] })
      .then((res) => {
        this.logger.debug(
          `requested 'txStatus' for txId [${transactionId}]. res: ${JsonBigInt.stringify(
            res,
          )}`,
        );
        const confirmation = res[0].num_confirmations;
        if (confirmation !== undefined && confirmation !== null)
          return Number(confirmation);
        return -1;
      })
      .catch((e) => {
        const baseError = `Failed to get confirmation for tx [${transactionId}] from Koios: `;
        if (e.response) {
          throw new FailedError(baseError + e.response.data.reason);
        } else if (e.request) {
          throw new NetworkError(baseError + e.message);
        } else {
          throw new UnexpectedApiError(baseError + e.message);
        }
      });
  };

  /**
   * gets the amount of each asset in an address
   * @param address the address
   * @returns an object containing the amount of each asset
   */
  getAddressAssets = async (address: string): Promise<AssetBalance> => {
    let nativeToken = 0n;
    let tokens: Array<TokenInfo> = [];

    // get ADA value
    let addressInfo: AddressInfo;
    try {
      addressInfo = await this.client.addressInfo({
        _addresses: [address],
      });
      this.logger.debug(
        `requested 'addressInfo' for address [${address}]. res: ${JsonBigInt.stringify(
          addressInfo,
        )}`,
      );
    } catch (e: any) {
      const baseError = `Failed to get address [${address}] assets from Koios: `;
      if (e.response) {
        throw new FailedError(baseError + e.response.data.reason);
      } else if (e.request) {
        throw new NetworkError(baseError + e.message);
      } else {
        throw new UnexpectedApiError(baseError + e.message);
      }
    }
    if (addressInfo.length !== 0) {
      if (!addressInfo[0].balance)
        throw new KoiosNullValueError('Address balance is null');
      nativeToken = BigInt(addressInfo[0].balance);
    }

    // get tokens value
    let addressAssets: AddressAssets;
    try {
      addressAssets = await this.client.addressAssets({
        _addresses: [address],
      });
      this.logger.debug(
        `requested 'addressAssets' for address [${address}]. res: ${JsonBigInt.stringify(
          addressAssets,
        )}`,
      );
    } catch (e: any) {
      const baseError = `Failed to get address [${address}] assets from Koios: `;
      if (e.response) {
        throw new FailedError(baseError + e.response.data.reason);
      } else if (e.request) {
        throw new NetworkError(baseError + e.message);
      } else {
        throw new UnexpectedApiError(baseError + e.message);
      }
    }
    tokens = addressAssets.map((asset) => {
      if (
        !asset.policy_id ||
        asset.asset_name === null ||
        asset.asset_name === undefined ||
        !asset.quantity
      )
        throw new KoiosNullValueError('Asset info is null');
      return {
        id: CardanoUtils.generateAssetId(asset.policy_id, asset.asset_name),
        value: BigInt(asset.quantity),
      };
    });

    return {
      nativeToken: nativeToken,
      tokens: tokens,
    };
  };

  /**
   * gets id of all transactions in the given block
   * @param blockId the block id
   * @returns list of the transaction ids in the block
   */
  getBlockTransactionIds = (blockId: string): Promise<Array<string>> => {
    return this.client
      .blockTxs({ _block_hashes: [blockId] })
      .then((res) => {
        this.logger.debug(
          `requested 'blockTxs' for blockId [${blockId}]. res: ${JsonBigInt.stringify(
            res,
          )}`,
        );
        return res.map((block) => {
          const txId = block.tx_hash;
          if (!txId) throw new KoiosNullValueError(`Block tx hash is null`);
          return txId;
        });
      })
      .catch((e) => {
        const baseError = `Failed to get block [${blockId}] transaction ids from Koios: `;
        if (e.response) {
          throw new FailedError(baseError + e.response.data.reason);
        } else if (e.request) {
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
      .blockInfo({ _block_hashes: [blockId] })
      .then((res) => {
        this.logger.debug(
          `requested 'blockInfo' for blockId [${blockId}]. res: ${JsonBigInt.stringify(
            res,
          )}`,
        );
        const block = res[0];
        if (!block.block_height || !block.hash || !block.parent_hash)
          throw new KoiosNullValueError(`Block info data are null`);
        return {
          hash: block.hash,
          parentHash: block.parent_hash,
          height: Number(block.block_height),
        };
      })
      .catch((e) => {
        const baseError = `Failed to get block [${blockId}] info from Koios: `;
        if (e.response) {
          throw new FailedError(baseError + e.response.data.reason);
        } else if (e.request) {
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
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    blockId: string,
  ): Promise<CardanoTx> => {
    const cborTx = await this.client
      .txCbor({ _tx_hashes: [transactionId] })
      .then((res) => {
        this.logger.debug(
          `requested 'txCbor' for txId [${transactionId}]. res: ${JsonBigInt.stringify(
            res,
          )}`,
        );
        if (res.length > 0 && res[0].cbor) {
          return res[0].cbor;
        }
        throw new FailedError(
          `No transaction data received for txId [${transactionId}]`,
        );
      })
      .catch((e: any) => {
        const baseError = `Failed to get transaction [${transactionId}] from Koios: `;
        if (e.response) {
          throw new FailedError(baseError + e.response.data.reason);
        } else if (e.request) {
          throw new NetworkError(baseError + e.message);
        } else {
          throw new UnexpectedApiError(baseError + e.message);
        }
      });
    // Parse CBOR transaction
    const tx = Transaction.from_hex(cborTx);

    // Extract metadata
    const metadata = tx.auxiliary_data()?.metadata()
      ? this.parseMetadata(tx.auxiliary_data()!.metadata()!)
      : undefined;

    const txBody = tx.body();
    // Extract inputs and outputs
    const inputs: Array<CardanoTxInput> = [];
    const txInputs = txBody.inputs();
    for (let i = 0; i < txInputs.len(); i++)
      inputs.push(this.convertToCardanoTxInput(txInputs.get(i)));

    const outputs: Array<CardanoBoxCandidate> = [];
    const txOutputs = txBody.outputs();
    for (let i = 0; i < txOutputs.len(); i++)
      outputs.push(this.convertToCardanoBoxCandidate(txOutputs.get(i)));

    // Calculate fee
    const fee = BigInt(txBody.fee().to_str());

    // Generate txId
    const txId = FixedTransaction.from_hex(cborTx).transaction_hash().to_hex();
    return {
      id: txId,
      inputs,
      outputs,
      fee,
      metadata,
    };
  };

  /**
   * submits a transaction
   * @param transaction the transaction
   */
  submitTransaction = async (transaction: Transaction): Promise<void> => {
    const txBlob = new Blob([transaction.to_bytes().slice()], {
      type: 'application/cbor',
    });
    await this.client.submittx(txBlob);
  };

  /**
   * gets all transactions in mempool (returns empty list if the chain has no mempool)
   * Note: Koios does not support mempool. So function returns empty list
   * @returns empty list
   */
  getMempoolTransactions = async (): Promise<Array<CardanoTx>> => {
    // since Koios does not support mempool, it returns empty list
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
    const boxes = await this.client
      .addressInfo({ _addresses: [address] })
      .then((res) => {
        this.logger.debug(
          `requested 'addressInfo' for address [${address}]. res: ${JsonBigInt.stringify(
            res,
          )}`,
        );
        if (res.length === 0) return [];
        const utxos = res[0].utxo_set;
        if (!utxos) throw new KoiosNullValueError(`Address UTxO list is null`);
        return utxos.map(this.parseCardanoUTxO);
      })
      .catch((e) => {
        const baseError = `Failed to get address [${address}] UTxOs Koios: `;
        if (e.response) {
          throw new FailedError(baseError + e.response.data.reason);
        } else if (e.request) {
          throw new NetworkError(baseError + e.message);
        } else {
          throw new UnexpectedApiError(baseError + e.message);
        }
      });
    return boxes.slice(offset, offset + limit);
  };

  /**
   * checks if a box is still unspent and valid
   * @param boxId the box id (txId + . + index)
   * @returns true if the box is unspent and valid
   */
  isBoxUnspentAndValid = async (boxId: string): Promise<boolean> => {
    const [txId, index] = boxId.split('.');

    const cborTx = await this.client
      .txCbor({ _tx_hashes: [txId] })
      .then((res) => {
        this.logger.debug(
          `requested 'txCbor' for txId [${txId}]. res: ${JsonBigInt.stringify(
            res,
          )}`,
        );
        if (res.length > 0 && res[0].cbor) {
          return res[0].cbor;
        }
        return undefined;
      })
      .catch((e: any) => {
        const baseError = `Failed to get transaction [${txId}] UTxOs from Koios: `;
        if (e.response) {
          throw new FailedError(baseError + e.response.data.reason);
        } else if (e.request) {
          throw new NetworkError(baseError + e.message);
        } else {
          throw new UnexpectedApiError(baseError + e.message);
        }
      });
    if (!cborTx) {
      this.logger.debug(
        `Utxo [${boxId}] is invalid. Tx [${txId}] is not found`,
      );
      return false;
    }
    const tx = Transaction.from_hex(cborTx);
    const boxAddressCred = tx
      .body()
      .outputs()
      .get(Number(index))
      .address()
      .payment_cred()
      ?.to_keyhash()
      ?.to_hex();
    if (!boxAddressCred)
      throw new UnexpectedApiError(
        `Failed to extract address credential: ${tx
          .body()
          .outputs()
          .get(Number(index))
          .address()
          .payment_cred()
          ?.to_json()}`,
      );

    const utxos = await this.client
      .credentialUtxos({ _payment_credentials: [boxAddressCred] })
      .catch((e) => {
        const baseError = `Failed to get address credential [${boxAddressCred}] UTxOs from Koios: `;
        if (e.response) {
          throw new FailedError(baseError + e.response.data.reason);
        } else if (e.request) {
          throw new NetworkError(baseError + e.message);
        } else {
          throw new UnexpectedApiError(baseError + e.message);
        }
      });
    this.logger.debug(
      `requested 'credentialUtxos' for box cred [${boxAddressCred}]. res: ${JsonBigInt.stringify(
        utxos,
      )}`,
    );
    const box = utxos.find(
      (utxo) => utxo.tx_hash === txId && utxo.tx_index?.toString() === index,
    );
    return box !== undefined;
  };

  /**
   * gets the current network slot
   * @returns the current network slot
   */
  currentSlot = (): Promise<number> => {
    return this.client
      .tip()
      .then((block) => {
        this.logger.debug(
          `requested 'tip'. res: ${JsonBigInt.stringify(block)}`,
        );
        const slot = block[0].abs_slot;
        if (slot) return Number(slot);
        throw new KoiosNullValueError('Slot of last block is null');
      })
      .catch((e) => {
        const baseError = `Failed to fetch current slot from Koios: `;
        if (e.response) {
          throw new FailedError(baseError + `${e.response.data.reason}`);
        } else if (e.request) {
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

    const cborTx = await this.client
      .txCbor({ _tx_hashes: [txId] })
      .then((res) => {
        this.logger.debug(
          `requested 'txCbor' for txId [${txId}]. res: ${JsonBigInt.stringify(
            res,
          )}`,
        );
        if (res.length > 0 && res[0].cbor) {
          return res[0].cbor;
        }
        throw new FailedError(
          `No transaction data received for txId [${txId}]`,
        );
      })
      .catch((e: any) => {
        const baseError = `Failed to get transaction [${txId}] UTxOs from Koios: `;
        if (e.response) {
          throw new FailedError(baseError + e.response.data.reason);
        } else if (e.request) {
          throw new NetworkError(baseError + e.message);
        } else {
          throw new UnexpectedApiError(baseError + e.message);
        }
      });
    const tx = Transaction.from_hex(cborTx);
    const txOutputs = tx.body().outputs();
    if (txOutputs.len() <= Number(index))
      throw new FailedError(
        `Tx [${txId}] has only [${txOutputs.len()}] outputs but requested index [${index}]`,
      );

    const boxCandidate = this.convertToCardanoBoxCandidate(
      txOutputs.get(Number(index)),
    );
    return {
      txId: txId,
      index: Number(index),
      value: boxCandidate.value,
      assets: boxCandidate.assets,
    };
  };

  /**
   * parses CardanoAssets object from asset_list object returned by Koios
   * @param asset asset_list object
   * @returns CardanoAssets object
   */
  private parseAssetList = (
    asset: TxInfoItemInputsItemAssetListAnyOfItem,
  ): CardanoAsset => {
    if (
      !(
        asset.policy_id &&
        asset.asset_name !== null &&
        asset.asset_name !== undefined &&
        asset.quantity
      )
    )
      throw new KoiosNullValueError('UTxO asset info items are null');

    return {
      policyId: asset.policy_id,
      assetName: asset.asset_name,
      quantity: BigInt(asset.quantity),
    };
  };

  /**
   * parses CardanoUtxo object from input utxo format returned by Koios
   * @param input
   * @returns
   */
  private parseCardanoUTxO = (input: TxInfoItemInputsItem): CardanoUtxo => {
    if (
      !input.tx_hash ||
      input.tx_index === undefined ||
      !input.value ||
      !input.asset_list
    )
      throw new KoiosNullValueError('Tx input info items are null');

    return {
      txId: input.tx_hash,
      index: Number(input.tx_index),
      value: BigInt(input.value),
      assets: input.asset_list.map(this.parseAssetList),
    };
  };

  /**
   * gets required parameters of Cardano Protocol
   * @returns an object containing required protocol parameters
   */
  getProtocolParameters = async (): Promise<CardanoProtocolParameters> => {
    const allParams = await this.client.epochParams();
    const epochParams = allParams[0];
    this.logger.debug(
      `requested 'epochParams'. index 0: ${JsonBigInt.stringify(epochParams)}`,
    );

    if (
      !epochParams.min_fee_a ||
      !epochParams.min_fee_b ||
      !epochParams.pool_deposit ||
      !epochParams.key_deposit ||
      !epochParams.max_val_size ||
      !epochParams.max_tx_size ||
      !epochParams.coins_per_utxo_size
    )
      throw new KoiosNullValueError(
        `Some required Cardano protocol params are undefined or null `,
      );

    return {
      minFeeA: epochParams.min_fee_a,
      minFeeB: epochParams.min_fee_b,
      poolDeposit: epochParams.pool_deposit,
      keyDeposit: epochParams.key_deposit,
      maxValueSize: epochParams.max_val_size,
      maxTxSize: epochParams.max_tx_size,
      coinsPerUtxoSize: epochParams.coins_per_utxo_size,
    };
  };

  /**
   * gets token details (name, decimals)
   * @param tokenId
   */
  getTokenDetail = async (tokenId: string): Promise<TokenDetail> => {
    let tokenDetail: AssetInfo;
    try {
      tokenDetail = await this.client.assetInfo({
        _asset_list: [tokenId.split('.')],
      });
      this.logger.debug(
        `requested 'assetInfo' for asset [${tokenId}]. res: ${JsonBigInt.stringify(
          tokenDetail,
        )}`,
      );
    } catch (e: any) {
      const baseError = `Failed to get asset [${tokenId}] info from Koios: `;
      if (e.response) {
        throw new FailedError(baseError + e.response.data.reason);
      } else if (e.request) {
        throw new NetworkError(baseError + e.message);
      } else {
        throw new UnexpectedApiError(baseError + e.message);
      }
    }

    if (tokenDetail.length === 0) throw new FailedError(`Token not found`);
    return {
      tokenId: tokenId,
      name: tokenDetail[0].token_registry_metadata?.name ?? UNKNOWN_TOKEN,
      decimals: tokenDetail[0].token_registry_metadata?.decimals ?? 0,
    };
  };

  /**
   * converts CardanoAssets object from MultiAsset
   * @param asset MultiAsset object
   * @returns CardanoAssets object
   */
  protected convertAssetList = (
    assets: MultiAsset | undefined,
  ): Array<CardanoAsset> => {
    const cardanoAssets: Array<CardanoAsset> = [];

    if (assets) {
      for (let i = 0; i < assets.keys().len(); i++) {
        const scriptHash = assets.keys().get(i);
        const asset = assets.get(scriptHash)!;
        for (let j = 0; j < asset.keys().len(); j++) {
          const assetName = asset.keys().get(j);
          const assetAmount = asset.get(assetName)!;
          cardanoAssets.push({
            policyId: scriptHash.to_hex(),
            assetName: CardanoUtils.assetNameToHex(assetName),
            quantity: BigInt(assetAmount.to_str()),
          });
        }
      }
    }
    return cardanoAssets;
  };

  /**
   * converts BlockFrost tx input schema to CardanoTxInput
   * @param input
   * @returns
   */
  protected convertToCardanoTxInput = (
    input: TransactionInput,
  ): CardanoTxInput => {
    return {
      txId: input.transaction_id().to_hex(),
      index: input.index(),
    };
  };

  /**
   * converts BlockFrost tx output schema to CardanoBoxCandidate
   * @param output
   * @returns
   */
  protected convertToCardanoBoxCandidate = (
    output: TransactionOutput,
  ): CardanoBoxCandidate => {
    return {
      address: output.address().to_bech32(),
      value: BigInt(output.amount().coin().to_str()),
      assets: this.convertAssetList(output.amount().multiasset()),
    };
  };

  /**
   * parses metadata object from BlockFrost tx metadata schema
   * @param output
   * @returns
   */
  protected parseMetadata = (
    metadata: GeneralTransactionMetadata,
  ): CardanoMetadata => {
    const keys = metadata.keys();
    const result: CardanoMetadata = {};
    for (let i = 0; i < keys.len(); i++) {
      const key = keys.get(i);
      result[key.to_str()] = JsonBigInt.parse(
        decode_metadatum_to_json_str(
          metadata.get(key)!,
          MetadataJsonSchema.NoConversions,
        ),
      );
    }
    return result;
  };
}

export default CardanoKoiosNetwork;
