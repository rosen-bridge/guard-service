import { migration1700756107393 } from './postgres/1700756107393-migration';
import { migration1702281574324 } from './postgres/1702281574324-migration';
import { migration1700755909353 } from './sqlite/1700755909353-migration';
import { migration1702281318566 } from './sqlite/1702281318566-migration';

export default {
  sqlite: [migration1700755909353, migration1702281318566],
  postgres: [migration1700756107393, migration1702281574324],
};
