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
  ) => string[];

  /**
   * checks if a box is still unspent and valid
   * @param boxId the box id
   * @returns true if the box is unspent and valid
   */
  abstract isBoxUnspentAndValid: (boxId: string) => boolean;

  /**
   * generates and adds box tracking map to trackMap (boxes are filtered by the address)
   * @param address the address
   * @param trackMap the box id to serialized box map
   * @returns true if the box is unspent and valid
   */
  abstract addMempoolMappingByAddressToTrack: (
    address: string,
    trackMap: Map<string, string>
  ) => void;
}

export default AbstractUtxoChainNetwork;
