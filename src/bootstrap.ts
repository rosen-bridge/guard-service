import 'reflect-metadata';
import Configs from './configs/Configs';
import WinstonLogger from '@rosen-bridge/winston-logger';

await WinstonLogger.init(Configs.logs);
