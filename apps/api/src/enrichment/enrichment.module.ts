import { Module } from "@nestjs/common";
import { BullModule } from "@nestjs/bullmq";
import { EnrichmentService } from "./enrichment.service";
import { EnrichmentController } from "./enrichment.controller";
import { WorkspacesModule } from "../workspaces/workspaces.module";

@Module({
  imports: [
    BullModule.registerQueue({ name: "email-queue" }),
    WorkspacesModule,
  ],
  providers: [EnrichmentService],
  controllers: [EnrichmentController],
  exports: [EnrichmentService],
})
export class EnrichmentModule {}
