import { migration1690179912025 } from './postgres/1690179912025-migration';
import { migration1690179839169 } from './sqlite/1690179839169-migration';

export default {
  sqlite: [migration1690179839169],
  postgres: [migration1690179912025],
};
