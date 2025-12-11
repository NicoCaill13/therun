import { CallHandler, ExecutionContext, Injectable, NestInterceptor, StreamableFile } from '@nestjs/common';
import { map } from 'rxjs/operators';
import { Reflector } from '@nestjs/core';

@Injectable()
export class SuccessResponseInterceptor implements NestInterceptor {
  constructor(private readonly reflector: Reflector) { }

  intercept(ctx: ExecutionContext, next: CallHandler) {
    const skip = this.reflector.get<boolean>('skipWrap', ctx.getHandler());
    if (skip) return next.handle();

    const http = ctx.switchToHttp();
    const res = http.getResponse<any>();

    return next.handle().pipe(
      map((data: any) => {
        // si headers déjà envoyés (ex: redirect), ne rien faire
        if (res.headersSent) return data;

        const statusCode = res?.statusCode ?? 200;

        // ne JAMAIS wrapper si pas 2xx (ex: 3xx redirect OAuth)
        if (statusCode < 200 || statusCode >= 300) return data;

        // ne pas wrapper streams/strings
        if (typeof data === 'string' || data instanceof Buffer || data instanceof StreamableFile) {
          return data;
        }

        // si handler @Redirect a renvoyé un objet { url, statusCode: 302 }, ne pas wrapper
        if (data && typeof data === 'object' && 'url' in data && data.statusCode >= 300 && data.statusCode < 400) {
          return data;
        }

        if (data && typeof data === 'object' && 'statusCode' in data && 'timestamp' in data) {
          return data;
        }

        const req = http.getRequest<any>();
        const path = req?.originalUrl ?? req?.url ?? '';

        return {
          statusCode,
          path,
          data,
          timestamp: new Date().toISOString(),
        };
      }),
    );
  }
}
