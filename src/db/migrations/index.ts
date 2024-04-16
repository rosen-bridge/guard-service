import { migration1700756107393 } from './postgres/1700756107393-migration';
import { migration1700755909353 } from './sqlite/1700755909353-migration';
import { migration1702281574324 } from './postgres/1702281574324-migration';
import { migration1702281318566 } from './sqlite/1702281318566-migration';
import { migration1703834034720 } from './postgres/1703834034720-migration';
import { migration1703833812339 } from './sqlite/1703833812339-migration';
import { migration1706610773000 } from './sqlite/1706610773000-migration';
import { migration1708090570000 } from './sqlite/1708090570000-migration';
import { migration1706610773001 } from './postgres/1706610773001-migration';
import { migration1708090570001 } from './postgres/1708090570001-migration';

export default {
  sqlite: [
    migration1700755909353,
    migration1702281318566,
    migration1703833812339,
    migration1706610773000,
    migration1708090570000,
  ],
  postgres: [
    migration1700756107393,
    migration1702281574324,
    migration1703834034720,
    migration1706610773001,
    migration1708090570001,
  ],
};
