import * as childProcess from 'child_process';
import Configs from '../helpers/Configs';
import { loggerFactory } from '../log/Logger';
const exec = childProcess.exec;

const logger = loggerFactory(import.meta.url);

/**
 * starts tss instance
 */
const startTssInstance = function () {
  const tssPath =
    Configs.tssExecutionPath +
    ' -configFile ' +
    Configs.tssConfigPath +
    ' -p2pPort ' +
    Configs.expressPort +
    ' -port ' +
    Configs.tssPort;

  exec(tssPath, function (err, data) {
    if (err !== null) {
      const timeout = Configs.tssInstanceRestartGap;
      logger.error(
        `TSS instance failed unexpectedly, TSS will be started in ${timeout}. Error: ${err}, ${data}`
      );
      // wait 5 seconds to start again
      setTimeout(startTssInstance, timeout * 1000);
    }
    logger.info('TSS instance started');
  });
};

export { startTssInstance };
