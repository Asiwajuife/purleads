import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from "@nestjs/common";
import { PrismaClient } from "@prisma/client";

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  private keepAliveInterval: NodeJS.Timeout | null = null;

  async onModuleInit() {
    const maxRetries = 6;
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        await this.$connect();
        break;
      } catch (err) {
        if (attempt === maxRetries) throw err;
        this.logger.warn(`Database not ready (Neon cold start), retrying in 4s... [${attempt}/${maxRetries}]`);
        await new Promise((r) => setTimeout(r, 4000));
      }
    }

    // Ping every 4 minutes to prevent Neon from suspending mid-session
    this.keepAliveInterval = setInterval(async () => {
      try {
        await this.$queryRaw`SELECT 1`;
      } catch {
        // ignore — next real query will surface the error if needed
      }
    }, 4 * 60 * 1000);
  }

  async onModuleDestroy() {
    if (this.keepAliveInterval) clearInterval(this.keepAliveInterval);
    await this.$disconnect();
  }
}
