import { 
  Injectable, 
  NestInterceptor, 
  ExecutionContext, 
  CallHandler 
} from '@nestjs/common';
import { Observable, of } from 'rxjs';
import { tap } from 'rxjs/operators';

@Injectable()
export class CacheInterceptor implements NestInterceptor {
  private cache = new Map<string, any>();
  private readonly TTL = 60000; // 60 seconds

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    
    // Only cache GET requests
    if (request.method !== 'GET') {
      return next.handle();
    }

    const key = `${request.url}-${JSON.stringify(request.query)}`;
    const cached = this.cache.get(key);

    // Return cached response if exists and not expired
    if (cached && Date.now() - cached.timestamp < this.TTL) {
      return of(cached.data);
    }

    // Cache new response
    return next.handle().pipe(
      tap(data => {
        this.cache.set(key, {
          data,
          timestamp: Date.now(),
        });
      }),
    );
  }
}