import { ErgoBox, ReducedTransaction, Transaction } from 'ergo-lib-wasm-nodejs';

import {
  ChainConfigs,
  PaymentTransactionJsonModel,
} from '@rosen-chains/abstract-chain';

interface ErgoConfigs extends ChainConfigs {
  minBoxValue: bigint;
  eventTxConfirmation: number;
}

interface ErgoTransactionJsonModel extends PaymentTransactionJsonModel {
  inputBoxes: Array<string>;
  dataInputs: Array<string>;
}

interface GuardsPkConfig {
  publicKeys: Array<string>;
  requiredSigns: number;
}

interface ErgoSignMediator {
  isInSign: (txId: string) => Promise<boolean>;
  sign: (
    tx: ReducedTransaction,
    requiredSign: number,
    boxes: Array<ErgoBox>,
    dataBoxes?: Array<ErgoBox>,
  ) => Promise<Transaction>;
}

export {
  ErgoConfigs,
  ErgoTransactionJsonModel,
  GuardsPkConfig,
  ErgoSignMediator,
};
