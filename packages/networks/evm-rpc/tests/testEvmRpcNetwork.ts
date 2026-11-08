import EvmRpcNetwork from '../lib';

export class TestEvmRpcNetwork extends EvmRpcNetwork {
  getProvider = () => this.provider;
}
