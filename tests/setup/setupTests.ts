import DatabaseActionMock from '../db/mocked/DatabaseAction.mock';
import TestConfigs from '../testUtils/TestConfigs';

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
