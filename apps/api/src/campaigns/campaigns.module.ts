import { Module } from "@nestjs/common";
import { BullModule } from "@nestjs/bullmq";
import { CampaignsService } from "./campaigns.service";
import { CampaignsController } from "./campaigns.controller";
import { WorkspacesModule } from "../workspaces/workspaces.module";

@Module({
  imports: [
    WorkspacesModule,
    BullModule.registerQueue({ name: "email-queue" }),
  ],
  providers: [CampaignsService],
  controllers: [CampaignsController],
  exports: [CampaignsService],
})
export class CampaignsModule {}
