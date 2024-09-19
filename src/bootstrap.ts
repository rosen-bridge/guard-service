import 'reflect-metadata';
import Configs from './configs/Configs';
import WinstonLogger from '@rosen-bridge/winston-logger';
import Utils from './utils/Utils';

await WinstonLogger.init(Configs.logs);

const logger = WinstonLogger.getInstance().getLogger(import.meta.url);

const version = Utils.readJsonFile('./package.json').version;

logger.info(`Guard Started with version ${version}`);
