import { Module } from "@nestjs/common";
import { EmailsService } from "./emails.service";
import { EmailsController } from "./emails.controller";
import { WorkspacesModule } from "../workspaces/workspaces.module";

@Module({
  imports: [WorkspacesModule],
  providers: [EmailsService],
  controllers: [EmailsController],
  exports: [EmailsService],
})
export class EmailsModule {}
