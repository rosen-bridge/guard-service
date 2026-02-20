import '@rosen-bridge/extended-typeorm/bootstrap';

import { DefaultLogger } from '@rosen-bridge/abstract-logger';
import CallbackLogger from '@rosen-bridge/callback-logger';
import WinstonLogger from '@rosen-bridge/winston-logger';

import packageJson from '../package.json' with { type: 'json' };
import Configs from './configs/configs';
import { rosenConfig } from './configs/rosenConfig';

const winston = WinstonLogger.createLogger(Configs.logs);
const callbackLogger = new CallbackLogger(winston);
DefaultLogger.init(callbackLogger);

const logger = DefaultLogger.getInstance().child(import.meta.url);
logger.info(`Guard version: ${packageJson.version}`);
logger.info(`Guard contract version: ${rosenConfig.contractVersion}`);
