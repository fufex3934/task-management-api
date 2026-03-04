import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { LoggerService } from '../logger/logger.service';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  constructor(private logger: LoggerService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const { method, url, ip, user } = request;
    const userAgent = request.get('user-agent') || '';
    const userId = user?.id || 'anonymous';

    const startTime = Date.now();

    // Log request
    this.logger.log(
      `📥 ${method} ${url} - User: ${userId} - IP: ${ip} - UA: ${userAgent}`,
      'HTTP Request',
    );

    return next.handle().pipe(
      tap({
        next: (data) => {
          // Log successful response
          const responseTime = Date.now() - startTime;
          this.logger.log(
            `📤 ${method} ${url} - ${responseTime}ms - Status: 200`,
            'HTTP Response',
          );
        },
        error: (error) => {
          // Log error response
          const responseTime = Date.now() - startTime;
          this.logger.error(
            `❌ ${method} ${url} - ${responseTime}ms - Status: ${error.status || 500}`,
            error.stack,
            'HTTP Error',
          );
        },
      }),
    );
  }
}
