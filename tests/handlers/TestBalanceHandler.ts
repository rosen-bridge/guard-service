import { DataSource } from 'typeorm';
import BalanceHandler from '../../src/handlers/BalanceHandler';

class TestBalanceHandler extends BalanceHandler {
  constructor(dataSource: DataSource) {
    super(dataSource);
  }

  callGetChainAddresses = (chain: string) => this.getChainAddresses(chain);

  callGetChainTokenIds = (chain: string) => this.getChainTokenIds(chain);
}

export default TestBalanceHandler;
