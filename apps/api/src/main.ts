import { NestFactory } from "@nestjs/core";
import { ValidationPipe } from "@nestjs/common";
import { AppModule } from "./app.module";
import { PrismaExceptionFilter } from "./common/filters/prisma-exception.filter";
import helmet from "helmet";
import * as compression from "compression";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.use(helmet());
  app.use(compression());

  // Restrict CORS to the deployed frontend URL only
  const allowedOrigin = process.env.FRONTEND_URL || "http://localhost:3000";
  app.enableCors({
    origin: allowedOrigin,
    credentials: true,
  });

  app.useGlobalFilters(new PrismaExceptionFilter());

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.setGlobalPrefix("api");

  // Health check (no auth, used by uptime monitors and load balancers)
  const httpAdapter = app.getHttpAdapter();
  httpAdapter.get("/health", (_req: any, res: any) => {
    res.status(200).json({ status: "ok", ts: new Date().toISOString() });
  });

  const port = process.env.PORT || process.env.API_PORT || 3001;
  await app.listen(port);
  console.log(`🚀 Purleads API running on port ${port} (CORS: ${allowedOrigin})`);
}

bootstrap();
