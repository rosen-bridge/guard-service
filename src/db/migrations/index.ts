import { migration1700756107393 } from './postgres/1700756107393-migration';
import { migration1701604819671 } from './postgres/1701604819671-migration';
import { migration1700755909353 } from './sqlite/1700755909353-migration';
import { migration1701494227818 } from './sqlite/1701494227818-migration';

export default {
  sqlite: [migration1700755909353, migration1701494227818],
  postgres: [migration1700756107393, migration1701604819671],
};
