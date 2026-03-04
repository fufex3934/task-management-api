import { Injectable, LoggerService as NestLoggerService } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';

@Injectable()
export class LoggerService implements NestLoggerService {
  private logger: winston.Logger;

  constructor(private readonly configService: ConfigService) {
    const logLevel = this.configService.get<string>('logging.level') || 'info';
    const isProduction =
      this.configService.get<string>('nodeEnv') === 'production';

    /**
     * Shared JSON format for file logs
     */
    const fileLogFormat = winston.format.combine(
      winston.format.timestamp(),
      winston.format.errors({ stack: true }),
      winston.format.json(),
    );

    /**
     * Console Transport
     */
    const consoleTransport = new winston.transports.Console({
      level: logLevel,
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.colorize(),
        winston.format.printf(
          ({ timestamp, level, message, context, trace }) => {
            return `${timestamp} [${
              context || 'Application'
            }] ${level}: ${message}${trace ? '\n' + trace : ''}`;
          },
        ),
      ),
    });

    /**
     * Application Log File (Daily Rotation)
     */
    const fileTransport = new DailyRotateFile({
      filename: 'logs/application-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      zippedArchive: true,
      maxSize: '20m',
      maxFiles: '14d',
      level: logLevel,
      format: fileLogFormat,
    });

    /**
     * Error Log File (Daily Rotation)
     */
    const errorFileTransport = new DailyRotateFile({
      filename: 'logs/error-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      zippedArchive: true,
      maxSize: '20m',
      maxFiles: '30d',
      level: 'error',
      format: fileLogFormat,
    });

    /**
     * Create Winston Logger
     */
    this.logger = winston.createLogger({
      level: logLevel,
      transports: [consoleTransport],
    });

    /**
     * Add file transports only in production
     */
    if (isProduction) {
      this.logger.add(fileTransport);
      this.logger.add(errorFileTransport);
    }
  }

  log(message: any, context?: string) {
    this.logger.info(message, { context });
  }

  error(message: any, trace?: string, context?: string) {
    this.logger.error(message, { trace, context });
  }

  warn(message: any, context?: string) {
    this.logger.warn(message, { context });
  }

  debug(message: any, context?: string) {
    this.logger.debug(message, { context });
  }

  verbose(message: any, context?: string) {
    this.logger.verbose(message, { context });
  }
}