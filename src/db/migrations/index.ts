import { migration1668494432249 } from './sqlite/1668494432249-migration';
import { migration1669739759526 } from './sqlite/1669739759526-migration';
import { migration1673527416815 } from './postgres/1673527416815-migration';
import { migration1673527456553 } from './postgres/1673527456553-migration';


export default {
  sqlite: [migration1668494432249, migration1669739759526],
  postgres: [migration1673527416815, migration1673527456553],
}
