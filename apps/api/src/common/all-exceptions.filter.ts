import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from "@nestjs/common";
import { randomUUID } from "node:crypto";

interface ErrorResponse {
  statusCode: number;
  message: string;
  requestId: string;
  timestamp: string;
  errors?: string[];
}

/**
 * Filtro global de excepciones (AUDITORIA.md F2.8).
 * - Añade un requestId a cada respuesta de error para correlación.
 * - Registra logs estructurados (JSON) con requestId, ruta y estado.
 * - No filtra mensajes de HttpException controlados (son intencionales);
 *   en producción oculta detalles internos de errores no controlados.
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<{
      status: (code: number) => {
        json: (body: unknown) => void;
      };
    }>();
    const request = ctx.getRequest<{ url: string; method: string }>();
    const requestId = randomUUID();
    const timestamp = new Date().toISOString();

    let statusCode: number;
    let message: string;
    let errors: string[] | undefined;

    if (exception instanceof HttpException) {
      statusCode = exception.getStatus();
      const res = exception.getResponse();
      if (typeof res === "string") {
        message = res;
      } else if (
        typeof res === "object" &&
        res !== null &&
        "message" in res
      ) {
        const raw = (res as { message: string | string[] }).message;
        if (Array.isArray(raw)) {
          errors = raw;
          message = raw.join(", ");
        } else {
          message = raw;
        }
      } else {
        message = "Error de la aplicación";
      }
    } else {
      statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
      message = "Error interno del servidor";
      this.logger.error(
        `Error no controlado en ${request.method} ${request.url}`,
        exception instanceof Error ? exception.stack : String(exception)
      );
    }

    // Log estructurado para observabilidad.
    this.logger.warn(
      `${request.method} ${request.url} -> ${statusCode} (${requestId})`
    );

    const body: ErrorResponse = {
      statusCode,
      message,
      requestId,
      timestamp,
      ...(errors ? { errors } : {}),
    };

    response.status(statusCode).json(body);
  }
}
