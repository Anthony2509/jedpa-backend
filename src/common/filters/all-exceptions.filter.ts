import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { STATUS_CODES } from 'node:http';
import { QueryFailedError } from 'typeorm';

const PG_UNIQUE_VIOLATION = '23505';

interface ErrorBody {
  statusCode: number;
  message: string | string[];
  error: string;
  path: string;
  timestamp: string;
}

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const request = ctx.getRequest<Request>();
    const response = ctx.getResponse<Response>();

    const { statusCode, message } = this.resolve(exception);

    const body: ErrorBody = {
      statusCode,
      message,
      error: STATUS_CODES[statusCode] ?? 'Error',
      path: request.url,
      timestamp: new Date().toISOString(),
    };

    response.status(statusCode).json(body);
  }

  private resolve(exception: unknown): {
    statusCode: number;
    message: string | string[];
  } {
    if (exception instanceof HttpException) {
      const res = exception.getResponse();
      const message =
        typeof res === 'object' && res !== null && 'message' in res
          ? (res as { message: string | string[] }).message
          : exception.message;
      return { statusCode: exception.getStatus(), message };
    }

    if (
      exception instanceof QueryFailedError &&
      (exception.driverError as { code?: string } | undefined)?.code ===
        PG_UNIQUE_VIOLATION
    ) {
      // No se expone el detalle de PostgreSQL: incluye los valores duplicados (p. ej. DNI).
      return {
        statusCode: HttpStatus.CONFLICT,
        message: 'Ya existe un registro con esos datos.',
      };
    }

    // Solo nombre y stack: los parámetros de la consulta pueden tener datos personales.
    const err = exception instanceof Error ? exception : undefined;
    this.logger.error(err?.name ?? 'UnknownError', err?.stack);
    return {
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      message: 'Ocurrió un error interno. Inténtelo nuevamente más tarde.',
    };
  }
}
