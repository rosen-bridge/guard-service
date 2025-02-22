import '../../src/bootstrap';
import DatabaseActionMock from '../db/mocked/DatabaseAction.mock';
import TestConfigs from '../testUtils/TestConfigs';
import * as TestTransactionSerializer from '../../tests/transaction/TestTransactionSerializer';
import { TokensConfig } from '../../src/configs/tokensConfig';
import config from 'config';

// initialize TokensConfig
console.log(config.get<string>('tokensPath'));
await TokensConfig.init(config.get<string>('tokensPath'));

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
