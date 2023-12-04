import { migration1700756107393 } from './postgres/1700756107393-migration';
import { migration1700755909353 } from './sqlite/1700755909353-migration';

export default {
  sqlite: [migration1700755909353],
  postgres: [migration1700756107393],
};
