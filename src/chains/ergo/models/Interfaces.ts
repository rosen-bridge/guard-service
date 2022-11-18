import { Constant, ErgoBox } from 'ergo-lib-wasm-nodejs';
import { PaymentTransactionJsonModel } from '../../../models/Interfaces';

interface Asset {
  tokenId: string;
  amount: bigint;
}

interface Register {
  registerId: number;
  value: Constant;
}

interface Box {
  boxId: string;
  ergoTree: string;
  address: string;
  value: bigint;
  assets: Asset[];
  additionalRegisters: { [key: string]: ExplorerRegister };
}

interface Boxes {
  items: Box[];
  total: number;
}

interface CoveringErgoBoxes {
  covered: boolean;
  boxes: ErgoBox[];
}

interface BoxesAssets {
  ergs: bigint;
  tokens: AssetMap;
}

interface AssetMap {
  [id: string]: bigint;
}

interface ErgoBlockHeader {
  extensionId: string;
  difficulty: string;
  votes: string;
  timestamp: number;
  size: number;
  stateRoot: string;
  height: number;
  nBits: number;
  version: number;
  id: string;
  adProofsRoot: string;
  transactionsRoot: string;
  extensionHash: string;
  powSolutions: {
    pk: string;
    w: string;
    n: string;
    d: number;
  };
  adProofsId: string;
  transactionsId: string;
  parentId: string;
}

interface ErgoTransactionJsonModel extends PaymentTransactionJsonModel {
  inputBoxes: string[];
  dataInputs: string[];
}

interface ExplorerRegister {
  serializedValue: string;
  sigmaType: string;
  renderedValue: string;
}

interface ExplorerToken {
  tokenId: string;
  index: number;
  amount: number;
}

interface ExplorerInputBox {
  boxId: string;
  value: number;
  outputTransactionId: string;
  outputBlockId: string;
  outputIndex: number;
  ergoTree: string;
  address: string;
  assets: ExplorerToken[];
  additionalRegisters: { [key: string]: ExplorerRegister };
}

interface ExplorerOutputBox {
  boxId: string;
  transactionId: string;
  blockId: string;
  value: number;
  index: number;
  creationHeight: number;
  ergoTree: string;
  address: string;
  assets: ExplorerToken[];
  additionalRegisters: { [key: string]: ExplorerRegister };
}

interface ExplorerTransaction {
  id: string;
  numConfirmations: number;
  inputs: ExplorerInputBox[];
  outputs: ExplorerOutputBox[];
}

interface AddressInfo {
  summary: {
    id: string;
  };
  transactions: {
    confirmedBalance: bigint;
    confirmedTokensBalance: TokenBalance[];
  };
}

interface TokenBalance {
  tokenId: string;
  amount: bigint;
}

export {
  Asset,
  Register,
  Box,
  Boxes,
  CoveringErgoBoxes,
  BoxesAssets,
  AssetMap,
  ErgoBlockHeader,
  ErgoTransactionJsonModel,
  ExplorerOutputBox,
  ExplorerTransaction,
  AddressInfo,
};
