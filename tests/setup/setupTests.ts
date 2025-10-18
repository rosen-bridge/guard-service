import '../../src/bootstrap';
import DatabaseActionMock from '../db/mocked/databaseAction.mock';
import TestConfigs from '../testUtils/testConfigs';
import * as TestTransactionSerializer from '../transaction/testTransactionSerializer';
import { TokenHandler } from '../../src/handlers/tokenHandler';
import Configs from '../../src/configs/configs';

// initialize TokenHandler
await TokenHandler.init(Configs.tokensPath);

// mock database
await DatabaseActionMock.initDatabase();

// mock GuardPkHandler
vi.doMock('../../src/handlers/guardPkHandler', () => ({
  default: {
    getInstance: () => ({
      publicKeys: TestConfigs.guardPublicKeys,
      requiredSign: TestConfigs.requiredSigns,
      guardsLen: TestConfigs.guardPublicKeys.length,
      guardId: TestConfigs.guardIndex,
    }),
  },
}));

// mock TransactionSerializer.fromJson
vi.doMock('../../src/transaction/transactionSerializer', () => ({
  fromJson: TestTransactionSerializer.fromJson,
}));
