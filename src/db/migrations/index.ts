import { migration1700756107393 } from './postgres/1700756107393-migration';
import { migration1702226307306 } from './postgres/1702226307306-migration';
import { migration1700755909353 } from './sqlite/1700755909353-migration';
import { migration1702223450431 } from './sqlite/1702223450431-migration';

export default {
  sqlite: [migration1700755909353, migration1702223450431],
  postgres: [migration1700756107393, migration1702226307306],
};
