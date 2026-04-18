import { ArgumentsHost, Catch, ExceptionFilter, HttpStatus, Logger } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { Response } from "express";

@Catch(Prisma.PrismaClientKnownRequestError, Prisma.PrismaClientValidationError, Prisma.PrismaClientInitializationError)
export class PrismaExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(PrismaExceptionFilter.name);

  catch(exception: any, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();

    this.logger.error(`Prisma error [${exception.code ?? exception.constructor.name}]: ${exception.message}`);

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = "Database error";

    if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      if (exception.code === "P2002") {
        status = HttpStatus.CONFLICT;
        message = "A record with this value already exists";
      } else if (exception.code === "P2025") {
        status = HttpStatus.NOT_FOUND;
        message = "Record not found";
      } else if (exception.code === "P1001") {
        status = HttpStatus.SERVICE_UNAVAILABLE;
        message = "Database unavailable — please try again";
      } else {
        message = `Database error (${exception.code})`;
      }
    } else if (exception instanceof Prisma.PrismaClientValidationError) {
      status = HttpStatus.BAD_REQUEST;
      message = `Validation error: ${exception.message.split("\n").pop()?.trim() ?? "invalid query"}`;
    } else if (exception instanceof Prisma.PrismaClientInitializationError) {
      status = HttpStatus.SERVICE_UNAVAILABLE;
      message = "Database connection failed — please try again";
    }

    res.status(status).json({ statusCode: status, message });
  }
}
