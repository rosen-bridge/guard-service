import JSONBigInt from 'json-bigint';

import { loggerFactory } from '../../src/log/Logger';

const JsonBI = JSONBigInt({
  useNativeBigInt: true,
  alwaysParseAsBig: true,
});

const wrappedJsonBi: typeof JsonBI = {
  stringify: JsonBI.stringify,
  parse: (...args) => {
    try {
      return JsonBI.parse(...args);
    } catch (error) {
      const logger = loggerFactory(import.meta.url);
      logger.debug(`An error occurred while parsing value using json-bigint.`, {
        value: args[0],
      });

      throw error;
    }
  },
};

export { wrappedJsonBi as JsonBI };
