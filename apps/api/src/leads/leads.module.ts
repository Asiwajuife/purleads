import { Module } from "@nestjs/common";
import { LeadsService } from "./leads.service";
import { LeadsController } from "./leads.controller";
import { WorkspacesModule } from "../workspaces/workspaces.module";
import { EnrichmentModule } from "../enrichment/enrichment.module";

@Module({
  imports: [WorkspacesModule, EnrichmentModule],
  providers: [LeadsService],
  controllers: [LeadsController],
  exports: [LeadsService],
})
export class LeadsModule {}
