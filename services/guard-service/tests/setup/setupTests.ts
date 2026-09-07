import '../../src/bootstrap';

import Configs from '../../src/configs/configs';
import PublicStatusHandler from '../../src/handlers/publicStatusHandler';
import { TokenHandler } from '../../src/handlers/tokenHandler';
import DatabaseActionMock from '../db/mocked/databaseAction.mock';
import TestConfigs from '../testUtils/testConfigs';
import * as TestTransactionSerializer from '../transaction/testTransactionSerializer';

// initialize TokenHandler
await TokenHandler.init(Configs.tokensPath);

// mock database
await DatabaseActionMock.initDatabase();

// init PublicStatusHandler
await PublicStatusHandler.init(DatabaseActionMock.testDataSource);

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

// mock TransactionSerializer.fromJson (keep other exports, e.g. getTxDataHash, real)
vi.doMock('../../src/transaction/transactionSerializer', async () => {
  const actual = await vi.importActual<
    typeof import('../../src/transaction/transactionSerializer')
  >('../../src/transaction/transactionSerializer');
  return {
    ...actual,
    fromJson: TestTransactionSerializer.fromJson,
  };
});
