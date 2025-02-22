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
import { migration1722697111000 } from './sqlite/1722697111000-migration';
import { migration1722697112000 } from './sqlite/1722697112000-migration';
import { migration1722697954000 } from './postgres/1722697954000-migration';
import { migration1722697955000 } from './postgres/1722697955000-migration';
import { migration1722866531899 } from './postgres/1722866531899-migration';
import { migration1722866744957 } from './sqlite/1722866744957-migration';
import { migration1729941593477 } from './sqlite/1729941593477-migration';
import { migration1729941610141 } from './postgres/1729941610141-migration';
import { migration1730614394893 } from './sqlite/1730614394893-migration';
import { migration1730614402689 } from './postgres/1730614402689-migration';
import { migration1737547740177 } from './sqlite/1737547740177-migration';
import { migration1737547741177 } from './sqlite/1737547741177-migration';

export default {
  sqlite: [
    migration1700755909353,
    migration1702281318566,
    migration1703833812339,
    migration1706610773000,
    migration1708090570000,
    migration1722697111000,
    migration1722697112000,
    migration1722866744957,
    migration1729941593477,
    migration1730614394893,
    migration1737547740177,
    migration1737547741177,
  ],
  postgres: [
    migration1700756107393,
    migration1702281574324,
    migration1703834034720,
    migration1706610773001,
    migration1708090570001,
    migration1722697954000,
    migration1722697955000,
    migration1722866531899,
    migration1729941610141,
    migration1730614402689,
  ],
};
