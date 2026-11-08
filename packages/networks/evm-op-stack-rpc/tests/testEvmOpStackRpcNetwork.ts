import EvmOpStackRpcNetwork from '../lib';

export class TestEvmOpStackRpcNetwork extends EvmOpStackRpcNetwork {
  getProvider = () => this.provider;
  callGetBlock = this.getBlock;
  callEstimateL1Gas = this.estimateL1Gas;
  callEstimateL2Gas = this.estimateL2Gas;
}
