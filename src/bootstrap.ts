import 'reflect-metadata';
import Configs from './configs/Configs';
import packageJson from '../package.json' assert { type: 'json' };
import WinstonLogger from '@rosen-bridge/winston-logger';
import { rosenConfig } from './configs/RosenConfig';
import { DefaultLoggerFactory } from '@rosen-bridge/abstract-logger';

const winston = new WinstonLogger(Configs.logs);
DefaultLoggerFactory.init(winston);

const logger = DefaultLoggerFactory.getInstance().getLogger(import.meta.url);

logger.info(`Guard version: ${packageJson.version}`);
logger.info(`Guard contract version: ${rosenConfig.contractVersion}`);
