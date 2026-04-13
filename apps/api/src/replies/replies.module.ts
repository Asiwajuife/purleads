import { Module } from "@nestjs/common";
import { RepliesService } from "./replies.service";
import { RepliesController } from "./replies.controller";
import { RepliesInboundController } from "./replies-inbound.controller";
import { WorkspacesModule } from "../workspaces/workspaces.module";
import { WebhooksModule } from "../webhooks/webhooks.module";

@Module({
  imports: [WorkspacesModule, WebhooksModule],
  providers: [RepliesService],
  controllers: [RepliesController, RepliesInboundController],
  exports: [RepliesService],
})
export class RepliesModule {}
