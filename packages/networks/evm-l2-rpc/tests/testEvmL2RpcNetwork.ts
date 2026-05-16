import EvmL2RpcNetwork from '../lib';

export class TestEvmL2RpcNetwork extends EvmL2RpcNetwork {
  getProvider = () => this.provider;
}
