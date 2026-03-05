import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { MongooseModule } from '@nestjs/mongoose';
import { TasksModule } from './tasks/tasks.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { ConfigModule, ConfigService } from '@nestjs/config';
import appConfig from './config/app.config';
import { LoggerModule } from './logger/logger.module';
import { ThrottlerModule } from '@nestjs/throttler';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { WebSocketModule } from './websocket/websocket.module';

@Module({
  imports: [
    //load configuration based on node_env
    ConfigModule.forRoot({
      envFilePath: `.env.${process.env.NODE_ENV || 'development'}`,
      isGlobal: true, // Makes ConfigService available everywhere
      load: [appConfig],
    }),
    // Rate limiting
    // Rate limiting
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => [
        {
          // Adding a fallback value (e.g., 60000ms and 10 requests)
          // ensures the type is always 'number', not 'number | undefined'
          ttl: configService.get<number>('app.throttle.ttl') ?? 60000,
          limit: configService.get<number>('app.throttle.limit') ?? 10,
        },
      ],
    }),

    //use configService to get mongo uri
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => {
        const uri = configService.get<string>('MONGODB_URI');

        // Add validation
        if (!uri) {
          throw new Error(
            'MONGODB_URI is not defined in environment variables',
          );
        }

        return {
          uri,
          maxPoolSize: 10,
        };
      },
      inject: [ConfigService],
    }),
    EventEmitterModule.forRoot({
      wildcard: false,
      delimiter: '.',
      newListener: false,
      removeListener: false,
      maxListeners: 10,
      verboseMemoryLeak: true,
      ignoreErrors: false,
    }),
    TasksModule,
    AuthModule,
    UsersModule,
    LoggerModule,
    WebSocketModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
