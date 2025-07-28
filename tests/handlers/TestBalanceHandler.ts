import BalanceHandler from '../../src/handlers/BalanceHandler';

class TestBalanceHandler extends BalanceHandler {
  constructor() {
    super();
  }

  callGetChainTokenIds = (chain: string) => this.getChainTokenIds(chain);
}

export default TestBalanceHandler;
