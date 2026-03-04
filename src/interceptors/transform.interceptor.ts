import { 
  Injectable, 
  NestInterceptor, 
  ExecutionContext, 
  CallHandler,
  HttpStatus 
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface Response<T> {
  statusCode: number;
  message: string;
  data: T;
  timestamp: string;
  path: string;
}

@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<T, Response<T>> {
  intercept(context: ExecutionContext, next: CallHandler): Observable<Response<T>> {
    const request = context.switchToHttp().getRequest();
    const path = request.url;

    return next.handle().pipe(
      map((data) => ({
        statusCode: context.switchToHttp().getResponse().statusCode,
        message: data?.message || 'Success',
        data: data?.data || data,
        timestamp: new Date().toISOString(),
        path,
      })),
    );
  }
}