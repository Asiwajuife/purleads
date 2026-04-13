import { Module } from "@nestjs/common";
import { InboxesService } from "./inboxes.service";
import { InboxesController } from "./inboxes.controller";
import { WorkspacesModule } from "../workspaces/workspaces.module";

@Module({
  imports: [WorkspacesModule],
  providers: [InboxesService],
  controllers: [InboxesController],
  exports: [InboxesService],
})
export class InboxesModule {}
