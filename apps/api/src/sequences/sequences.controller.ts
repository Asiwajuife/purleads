import { Controller, Get, Post, Delete, Body, Param, UseGuards } from "@nestjs/common";
import { SequencesService } from "./sequences.service";
import { CreateSequenceDto } from "./dto/sequence.dto";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { CurrentUser, WorkspaceId } from "../common/decorators/current-user.decorator";

@Controller("campaigns/:campaignId/sequences")
@UseGuards(JwtAuthGuard)
export class SequencesController {
  constructor(private sequencesService: SequencesService) {}

  @Post()
  create(
    @Param("campaignId") campaignId: string,
    @Body() dto: CreateSequenceDto,
    @CurrentUser() user: any,
    @WorkspaceId() wid: string,
  ) {
    return this.sequencesService.create(wid, user.id, campaignId, dto);
  }

  @Get()
  findAll(
    @Param("campaignId") campaignId: string,
    @CurrentUser() user: any,
    @WorkspaceId() wid: string,
  ) {
    return this.sequencesService.findAll(wid, user.id, campaignId);
  }

  @Delete(":id")
  delete(@Param("id") id: string, @CurrentUser() user: any, @WorkspaceId() wid: string) {
    return this.sequencesService.delete(wid, user.id, id);
  }
}
