import { migration1700756107393 } from './postgres/1700756107393-migration';
import { migration1702226892058 } from './postgres/1702226892058-migration';
import { migration1700755909353 } from './sqlite/1700755909353-migration';
import { migration1702226882942 } from './sqlite/1702226882942-migration';

export default {
  sqlite: [migration1700755909353, migration1702226882942],
  postgres: [migration1700756107393, migration1702226892058],
};
