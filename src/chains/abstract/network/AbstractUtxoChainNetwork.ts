import AbstractChainNetwork from './AbstractChainNetwork';

abstract class AbstractUtxoChainNetwork extends AbstractChainNetwork {
  /**
   * gets confirmed and unspent boxes of an address
   * @param address the address
   * @returns an object containing the amount of each asset
   */
  abstract getAddressBoxes: (
    address: string,
    offset: number,
    limit: number
  ) => Promise<string[]>;

  /**
   * checks if a box is still unspent and valid
   * @param boxId the box id
   * @returns true if the box is unspent and valid
   */
  abstract isBoxUnspentAndValid: (boxId: string) => Promise<boolean>;
}

export default AbstractUtxoChainNetwork;
