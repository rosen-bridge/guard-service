import '../../src/bootstrap';
import DatabaseActionMock from '../db/mocked/DatabaseAction.mock';
import TestConfigs from '../testUtils/TestConfigs';
import * as TestTransactionSerializer from '../../tests/transaction/TestTransactionSerializer';

// mock database
await DatabaseActionMock.initDatabase();

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
