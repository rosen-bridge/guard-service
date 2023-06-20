import { migration1673527416815 } from './postgres/1673527416815-migration';
import { migration1687266364401 } from './sqlite/1687266364401-migration';

export default {
  sqlite: [migration1687266364401],
  postgres: [migration1673527416815],
};
