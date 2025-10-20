import BalanceHandler from '../../src/handlers/balanceHandler';

class TestBalanceHandler extends BalanceHandler {
  constructor() {
    super();
  }

  callGetChainTokenIds = (chain: string) => this.getChainTokenIds(chain);
}

export default TestBalanceHandler;
