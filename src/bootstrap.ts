import '@rosen-bridge/extended-typeorm/bootstrap';

import { CallbackLoggerFactory } from '@rosen-bridge/callback-logger';
import WinstonLogger from '@rosen-bridge/winston-logger';

import packageJson from '../package.json' with { type: 'json' };
import Configs from './configs/configs';
import { rosenConfig } from './configs/rosenConfig';

const winston = new WinstonLogger(Configs.logs);
CallbackLoggerFactory.init(winston);

const logger = CallbackLoggerFactory.getInstance().getLogger(import.meta.url);

logger.info(`Guard version: ${packageJson.version}`);
logger.info(`Guard contract version: ${rosenConfig.contractVersion}`);
