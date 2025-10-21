import { ChainAddressBalanceEntity } from '../../src/db/entities/chainAddressBalanceEntity';
import BalanceHandler from '../../src/handlers/balanceHandler';

class TestBalanceHandler extends BalanceHandler {
  constructor() {
    super();
  }

  callGetChainTokenIds = (chain: string) => this.getChainTokenIds(chain);

  callBalanceEntityToAddressBalance = (balance: ChainAddressBalanceEntity) =>
    this.balanceEntityToAddressBalance(balance);
}

export default TestBalanceHandler;
