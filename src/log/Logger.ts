import winston, { format } from 'winston';
import 'winston-daily-rotate-file';
import Configs from '../helpers/Configs';
import printf = format.printf;

class Logger {
  logger: winston.Logger;
  private readonly logsPath = Configs.logsPath;
  private readonly logOptions = {
    datePattern: 'YYYY-MM-DD',
    zippedArchive: true,
    maxSize: Configs.maxLogSize,
    maxFiles: Configs.maxLogFiles,
  };
  private readonly logFormat = printf(({ level, message, timestamp }) => {
    return `${timestamp} ${level} ${message}`;
  });
  private readonly logLevels = {
    error: 0,
    warn: 1,
    info: 2,
    debug: 3,
  };
  private readonly logLevel = Configs.logLevel;
  constructor() {
    this.logger = winston.createLogger({
      levels: this.logLevels,
      format: winston.format.combine(
        winston.format.timestamp(),
        this.logFormat
      ),
      transports: [
        new winston.transports.DailyRotateFile({
          filename: this.logsPath + 'rosen-%DATE%.log',
          ...this.logOptions,
          level: this.logLevel,
        }),
        new winston.transports.Console({
          format: winston.format.simple(),
          level: this.logLevel,
        }),
      ],
      handleRejections: true,
      handleExceptions: true,
    });
  }
}

const logger = new Logger().logger;

export { logger };
