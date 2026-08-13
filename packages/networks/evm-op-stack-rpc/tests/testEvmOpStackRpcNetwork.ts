import EvmOpStackRpcNetwork from '../lib';

export class TestEvmOpStackRpcNetwork extends EvmOpStackRpcNetwork {
  getProvider = () => this.provider;
  getDbAction = () => this.dbAction;
  callGetBlock = this.getBlock;
  callEstimateL1Gas = this.estimateL1Gas;
  callEstimateL2Gas = this.estimateL2Gas;
}
