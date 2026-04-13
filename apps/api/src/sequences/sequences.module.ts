import { Module } from "@nestjs/common";
import { SequencesService } from "./sequences.service";
import { SequencesController } from "./sequences.controller";
import { WorkspacesModule } from "../workspaces/workspaces.module";

@Module({
  imports: [WorkspacesModule],
  providers: [SequencesService],
  controllers: [SequencesController],
})
export class SequencesModule {}
