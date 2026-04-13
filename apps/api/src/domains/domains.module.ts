import { Module } from "@nestjs/common";
import { DomainsService } from "./domains.service";
import { DomainsController } from "./domains.controller";
import { WorkspacesModule } from "../workspaces/workspaces.module";

@Module({
  imports: [WorkspacesModule],
  providers: [DomainsService],
  controllers: [DomainsController],
})
export class DomainsModule {}
