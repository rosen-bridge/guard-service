import DatabaseActionMock from '../db/mocked/DatabaseAction.mock';
import TestConfigs from '../testUtils/TestConfigs';

// mock database
await DatabaseActionMock.initDatabase();

// mock guards config
vi.doMock('../../src/helpers/GuardConfig', () => ({
  guardConfig: {
    publicKeys: TestConfigs.guardPublicKeys,
    requiredSign: TestConfigs.requiredSigns,
    guardsLen: TestConfigs.guardPublicKeys.length,
    guardId: TestConfigs.guardIndex,
  },
}));
