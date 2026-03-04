import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { LoggerService } from './logger/logger.service';
import { LoggingInterceptor } from './interceptors/logging.interceptor';
import { TransformInterceptor } from './interceptors/transform.interceptor';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Get config and logger
  const configService = app.get(ConfigService);
  const logger = app.get(LoggerService);

  // Global prefix
  const apiPrefix = configService.get('app.apiPrefix');
  app.setGlobalPrefix(apiPrefix);

  // Global validation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Global interceptors
  app.useGlobalInterceptors(
    new LoggingInterceptor(logger),
    new TransformInterceptor(),
  );

  const port = configService.get('app.port');
  const nodeEnv = configService.get('app.nodeEnv');

  await app.listen(port);

  logger.log(
    `🚀 Application running on port ${port} in ${nodeEnv} mode`,
    'Bootstrap',
  );
}
// eslint-disable-next-line @typescript-eslint/no-floating-promises
bootstrap();
