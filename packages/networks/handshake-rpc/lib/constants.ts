/**
 * hsd reports a missing transaction, and any other unclassified failure, with
 * this code
 * https://github.com/handshake-org/hsd/blob/master/lib/protocol/errors.js
 */
export const RPC_MISC_ERROR = -1;

/**
 * hsd rejects a transaction paying less than `policy.MIN_RELAY`, which is 1000
 * dollarydoos per kB, i.e. one dollarydoo per virtual byte. Estimating below
 * this ratio builds transactions the network refuses to relay.
 * https://github.com/handshake-org/hsd/blob/master/lib/protocol/policy.js
 */
export const MINIMUM_FEE_RATIO = 1;

/**
 * fee rate in HNS/kB used when the node has too little history to estimate one
 * https://github.com/kyokan/bob-extension/blob/8fbf7c3ef171df340b05021d6f29de0c2e844b0e/src/ui/pages/SendTx/index.tsx#L20-L24
 */
export const FALLBACK_FEE_RATE = 0.05;

/**
 * covenant type of a regular spendable coin output (NONE)
 */
export const COIN_COVENANT_TYPE = 0;

/**
 * height hsd assigns to a coin that is still in the mempool
 */
export const MEMPOOL_COIN_HEIGHT = -1;
