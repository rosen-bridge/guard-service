/**
 * Enum representing all functions that a Doge network implementation should have
 */
export enum DogeNetworkFunction {
  // AbstractChainNetwork functions
  getHeight = 'getHeight',
  getTxConfirmation = 'getTxConfirmation',
  getAddressAssets = 'getAddressAssets',
  getBlockTransactionIds = 'getBlockTransactionIds',
  getBlockInfo = 'getBlockInfo',
  getTransaction = 'getTransaction',
  submitTransaction = 'submitTransaction',
  getMempoolTransactions = 'getMempoolTransactions',

  // AbstractUtxoChainNetwork functions
  getAddressBoxes = 'getAddressBoxes',
  isBoxUnspentAndValid = 'isBoxUnspentAndValid',

  // AbstractDogeNetwork specific functions
  getUtxo = 'getUtxo',
  getFeeRatio = 'getFeeRatio',
  isTxInMempool = 'isTxInMempool',
  getTransactionHex = 'getTransactionHex',
}

export default DogeNetworkFunction;
