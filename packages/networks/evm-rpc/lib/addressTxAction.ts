import { AbstractLogger, DummyLogger } from '@rosen-bridge/abstract-logger';
import { AddressTxsEntity } from '@rosen-bridge/evm-address-tx-extractor';
import { DataSource, Repository } from 'typeorm';

class AddressTxAction {
  private readonly repository: Repository<AddressTxsEntity>;
  private readonly address: string;
  readonly logger: AbstractLogger;

  constructor(
    address: string,
    dataSource: DataSource,
    logger?: AbstractLogger
  ) {
    this.repository = dataSource.getRepository(AddressTxsEntity);
    this.address = address;
    this.logger = logger ? logger : new DummyLogger();
  }

  /**
   * gets transaction by unsigned hash
   * @param unsignedHash
   */
  getTxByUnsignedHash = async (
    unsignedHash: string
  ): Promise<AddressTxsEntity | null> => {
    const res = await this.repository.find({
      where: {
        address: this.address,
        unsignedHash: unsignedHash,
      },
    });
    if (res.length === 0) {
      this.logger.debug(
        `No transaction is found with unsigned hash [${unsignedHash}]`
      );
      return null;
    } else if (res.length > 1) {
      this.logger.warn(
        `Found [${res.length}] transactions with unsigned hash [${unsignedHash}]. returning the first one...`
      );
    }
    return res[0];
  };

  /**
   * gets transaction by nonce
   * @param nonce
   */
  getTxByNonce = async (nonce: number): Promise<AddressTxsEntity> => {
    const res = await this.repository.find({
      where: {
        address: this.address,
        nonce: nonce,
      },
    });
    if (res.length === 0) {
      throw new Error(`No transaction is found with nonce [${nonce}]`);
    } else if (res.length > 1) {
      this.logger.warn(
        `Found [${res.length}] transactions with nonce [${nonce}]. returning the first one...`
      );
    }
    return res[0];
  };
}

export default AddressTxAction;
