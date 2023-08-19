import { migration1690179912025 } from './postgres/1690179912025-migration';
import { migration1692432476043 } from './postgres/1692432476043-migration';
import { migration1690179839169 } from './sqlite/1690179839169-migration';
import { migration1692431988132 } from './sqlite/1692431988132-migration';

export default {
  sqlite: [migration1690179839169, migration1692431988132],
  postgres: [migration1690179912025, migration1692432476043],
};
