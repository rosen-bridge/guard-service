import path from 'path';

import winston, { format } from 'winston';

import 'winston-daily-rotate-file';

import Configs from '../helpers/Configs';
import { JsonBI } from '../network/NetworkModels';

import { ConsoleLogConfig, FileLogConfig, LogConfig } from '../types';

import printf = format.printf;

const logLevels = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3,
};

const logFormat = printf(
  ({ level, message, timestamp, fileName, ...context }) => {
    return `${timestamp} ${level}: [${fileName}] ${message}${
      context && Object.keys(context).length
        ? ` ${JsonBI.stringify(context)}`
        : ''
    }`;
  }
);

interface TransportFactory<T extends LogConfig> {
  (config: T): winston.transport;
}
type LogTransports = {
  [Key in LogConfig['type']]:
    | TransportFactory<ConsoleLogConfig>
    | TransportFactory<FileLogConfig>;
};
const logTransports = {
  console: (config: ConsoleLogConfig) =>
    new winston.transports.Console({
      format: winston.format.simple(),
      level: config.level,
    }),
  file: (config: FileLogConfig) =>
    new winston.transports.DailyRotateFile({
      filename: `${config.path}rosen-%DATE%.log`,
      datePattern: 'YYYY-MM-DD',
      zippedArchive: true,
      maxSize: config.maxSize,
      maxFiles: config.maxFiles,
      level: config.level,
    }),
} satisfies LogTransports;

const logger = winston.createLogger({
  levels: logLevels,
  format: winston.format.combine(winston.format.timestamp(), logFormat),
  transports: [
    ...Configs.logs.map((config) => {
      switch (config.type) {
        case 'console':
          return logTransports.console(config);
        case 'file':
          return logTransports.file(config);
      }
    }),
  ],
  handleRejections: true,
  handleExceptions: true,
});

const loggerFactory = (filePath: string) =>
  logger.child({
    fileName: path.parse(filePath).name,
  });

export { loggerFactory };
