import { AbstractBoxSelection } from '@rosen-bridge/abstract-box-selection';
import AbstractChain from './AbstractChain';
import AbstractUtxoChainNetwork from './network/AbstractUtxoChainNetwork';

abstract class AbstractUtxoChain<
  TxType,
  BoxType
> extends AbstractChain<TxType> {
  declare network: AbstractUtxoChainNetwork<TxType, BoxType>;
  protected abstract boxSelection: AbstractBoxSelection<BoxType>;

  /**
   * generates mapping from input box id to serialized string of output box (filtered by address, containing the token)
   * @param address the address
   * @param tokenId the token id
   * @returns a Map from input box id to serialized string of output box
   */
  abstract getMempoolBoxMapping: (
    address: string,
    tokenId?: string
  ) => Promise<Map<string, BoxType | undefined>>;
}

export default AbstractUtxoChain;
