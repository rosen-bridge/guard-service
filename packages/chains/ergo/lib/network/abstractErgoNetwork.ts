import { AbstractUtxoChainNetwork } from '@rosen-chains/abstract-chain';
import { ErgoBox, ErgoStateContext, Transaction } from 'ergo-lib-wasm-nodejs';

abstract class AbstractErgoNetwork extends AbstractUtxoChainNetwork<
  Transaction,
  ErgoBox
> {
  /**
   * submits a transaction
   * @param transaction the transaction
   */
  declare submitTransaction: (transaction: Transaction) => Promise<void>;

  /**
   * gets the context of blockchain using 10 last blocks
   * @returns the state context object
   */
  abstract getStateContext: () => Promise<ErgoStateContext>;

  /**
   * gets confirmed and unspent boxes by tokenId
   * @param tokenId
   * @param address
   * @param offset
   * @param limit
   * @returns list of boxes
   */
  abstract getBoxesByTokenId: (
    tokenId: string,
    address: string,
    offset?: number,
    limit?: number
  ) => Promise<Array<ErgoBox>>;

  /**
   * gets box by id
   * @param boxId
   * @returns the ergo box
   */
  abstract getBox: (boxId: string) => Promise<ErgoBox>;

  /**
   * gets the actual id of a transaction by its hash
   * @param hash
   */
  getActualTxId = async (hash: string): Promise<string> => hash;
}

export default AbstractErgoNetwork;
