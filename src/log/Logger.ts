import path from 'path';

import winston, { format } from 'winston';

import 'winston-daily-rotate-file';

import Configs from '../helpers/Configs';

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
        ? ` ${JSON.stringify(context)}`
        : ''
    }`;
  }
);

const logger = winston.createLogger({
  levels: logLevels,
  format: winston.format.combine(winston.format.timestamp(), logFormat),
  transports: [
    ...Configs.rotateFileLogs.map(
      (config) =>
        new winston.transports.DailyRotateFile({
          filename: `${config.path}rosen-%DATE%.log`,
          datePattern: 'YYYY-MM-DD',
          zippedArchive: true,
          maxSize: config.maxSize,
          maxFiles: config.maxFiles,
          level: config.level,
        })
    ),
    new winston.transports.Console({
      format: winston.format.simple(),
      level: Configs.consoleLogs.level,
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
