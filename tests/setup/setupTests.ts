import '../../src/bootstrap';
import DatabaseActionMock from '../db/mocked/DatabaseAction.mock';
import TestConfigs from '../testUtils/TestConfigs';
import * as TestTransactionSerializer from '../../tests/transaction/TestTransactionSerializer';
import TestPublicStatusHandler from '../handlers/TestPublicStatusHandler';
import { TokenHandler } from '../../src/handlers/tokenHandler';
import Configs from '../../src/configs/Configs';

// initialize TokenHandler
await TokenHandler.init(Configs.tokensPath);

// mock database
await DatabaseActionMock.initDatabase();

// init PublicStatusHandler
await TestPublicStatusHandler.init(DatabaseActionMock.testDataSource);

vi.spyOn(
  TestPublicStatusHandler.getInstance().axios,
  'post'
).mockImplementation(async () => ({}));

// mock GuardPkHandler
vi.doMock('../../src/handlers/GuardPkHandler', () => ({
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
vi.doMock('../../src/transaction/TransactionSerializer', () => ({
  fromJson: TestTransactionSerializer.fromJson,
}));
