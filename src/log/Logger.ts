import winston, { format } from "winston";
import 'winston-daily-rotate-file';
import Configs from "../helpers/Configs";
import printf = format.printf;

class Logger{
    logger: winston.Logger;
    private readonly logsPath = Configs.logsPath;
    private readonly logOptions = {
        datePattern: 'YYYY-MM-DD-HH',
        zippedArchive: true,
        maxSize: Configs.maxLogSize,
        maxFiles: Configs.maxLogFiles,
    }
    private readonly logFormat = printf(({level, message, timestamp}) => {
        return `${timestamp} ${level} ${message}`;
    });

    constructor() {
        this.logger = winston.createLogger({
            format: winston.format.combine(
                winston.format.timestamp(),
                this.logFormat,
            ),
            transports: [

                //Error logs
                new winston.transports.DailyRotateFile({
                    filename: this.logsPath + 'error-%DATE%.log',
                    ...this.logOptions,
                    level: 'error'
                }),

                //Info logs
                new winston.transports.DailyRotateFile({
                    filename: this.logsPath + 'info-%DATE%.log',
                    ...this.logOptions,
                }),
            ],

            //Exception logs
            exceptionHandlers: [
                new winston.transports.DailyRotateFile({
                    filename: this.logsPath + 'exceptions-%DATE%.log',
                    ...this.logOptions,
                })
            ],

            //Rejection logs
            rejectionHandlers: [
                new winston.transports.DailyRotateFile({
                    filename: this.logsPath + 'rejections-%DATE%.log',
                    ...this.logOptions,
                })
            ],
        });

        //in case of development environment logs should be written in console
        if (process.env.NODE_ENV === 'development') {
            this.logger.add(new winston.transports.Console({
                format: winston.format.simple(),
            }))
        }
    }
}

const logger = new Logger().logger;

export { logger }
