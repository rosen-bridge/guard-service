import AbstractChainNetwork from './AbstractChainNetwork';

abstract class AbstractUtxoChainNetwork<
  TxType,
  BoxType
> extends AbstractChainNetwork<TxType> {
  /**
   * gets confirmed and unspent boxes of an address
   * @param address the address
   * @returns list of boxes
   */
  abstract getAddressBoxes: (
    address: string,
    offset: number,
    limit: number
  ) => Promise<Array<BoxType>>;

  /**
   * checks if a box is still unspent and valid
   * @param boxId the box id
   * @returns true if the box is unspent and valid
   */
  abstract isBoxUnspentAndValid: (boxId: string) => Promise<boolean>;
}

export default AbstractUtxoChainNetwork;
