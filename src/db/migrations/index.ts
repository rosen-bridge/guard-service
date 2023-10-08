import { migration1690179912025 } from './postgres/1690179912025-migration';
import { migration1692432476043 } from './postgres/1692432476043-migration';
import { migration1693034780793 } from './postgres/1693034780793-migration';
import { migration1696785518070 } from './postgres/1696785518070-migration';
import { migration1690179839169 } from './sqlite/1690179839169-migration';
import { migration1692431988132 } from './sqlite/1692431988132-migration';
import { migration1693033942504 } from './sqlite/1693033942504-migration';
import { migration1696784290158 } from './sqlite/1696784290158-migration';

export default {
  sqlite: [
    migration1690179839169,
    migration1692431988132,
    migration1693033942504,
    migration1696784290158,
  ],
  postgres: [
    migration1690179912025,
    migration1692432476043,
    migration1693034780793,
    migration1696785518070,
  ],
};
