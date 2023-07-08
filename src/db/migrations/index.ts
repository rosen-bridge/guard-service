import { migration1688794891025 } from './postgres/1688794891025-migration';
import { migration1688792775169 } from './sqlite/1688792775169-migration';

export default {
  sqlite: [migration1688792775169],
  postgres: [migration1688794891025],
};
