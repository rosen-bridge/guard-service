import 'reflect-metadata';
import Configs from './configs/Configs';
import WinstonLogger from '@rosen-bridge/winston-logger';
import Utils from './utils/Utils';
import { rosenConfig } from './configs/RosenConfig';

await WinstonLogger.init(Configs.logs);

const logger = WinstonLogger.getInstance().getLogger(import.meta.url);

const version = Utils.readJsonFile('./package.json').version;

logger.info(`Guard version: ${version}`);
logger.info(`Guard contract version: ${rosenConfig.contractVersion}`);
logger.info(`Guard tokens version: ${Configs.tokensVersion}`);
