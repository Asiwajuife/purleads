import { Module, NestModule, MiddlewareConsumer } from "@nestjs/common";
import { RateLimitMiddleware } from "./common/middleware/rate-limit.middleware";
import { ConfigModule } from "@nestjs/config";
import { BullModule } from "@nestjs/bullmq";
import { PrismaModule } from "./prisma/prisma.module";
import { AuthModule } from "./auth/auth.module";
import { UsersModule } from "./users/users.module";
import { WorkspacesModule } from "./workspaces/workspaces.module";
import { DomainsModule } from "./domains/domains.module";
import { InboxesModule } from "./inboxes/inboxes.module";
import { LeadsModule } from "./leads/leads.module";
import { CampaignsModule } from "./campaigns/campaigns.module";
import { SequencesModule } from "./sequences/sequences.module";
import { EmailsModule } from "./emails/emails.module";
import { RepliesModule } from "./replies/replies.module";
import { WebhooksModule } from "./webhooks/webhooks.module";
import { InvitesModule } from "./invites/invites.module";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    BullModule.forRoot({
      connection: {
        host: process.env.REDIS_HOST || "localhost",
        port: parseInt(process.env.REDIS_PORT || "6379"),
        password: process.env.REDIS_PASSWORD,
        tls: process.env.REDIS_TLS === "true" ? {} : undefined,
      },
    }),
    PrismaModule,
    AuthModule,
    UsersModule,
    WorkspacesModule,
    DomainsModule,
    InboxesModule,
    LeadsModule,
    CampaignsModule,
    SequencesModule,
    EmailsModule,
    RepliesModule,
    WebhooksModule,
    InvitesModule,
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(RateLimitMiddleware).forRoutes("*");
  }
}
