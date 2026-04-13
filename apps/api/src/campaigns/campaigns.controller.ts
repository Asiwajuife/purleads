import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards } from "@nestjs/common";
import { CampaignsService } from "./campaigns.service";
import { CreateCampaignDto, AddLeadsToCampaignDto } from "./dto/campaign.dto";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { CurrentUser, WorkspaceId } from "../common/decorators/current-user.decorator";

@Controller("campaigns")
@UseGuards(JwtAuthGuard)
export class CampaignsController {
  constructor(private campaignsService: CampaignsService) {}

  @Post()
  create(@Body() dto: CreateCampaignDto, @CurrentUser() user: any, @WorkspaceId() wid: string) {
    return this.campaignsService.create(wid, user.id, dto);
  }

  @Get()
  findAll(@CurrentUser() user: any, @WorkspaceId() wid: string) {
    return this.campaignsService.findAll(wid, user.id);
  }

  @Get(":id")
  findOne(@Param("id") id: string, @CurrentUser() user: any, @WorkspaceId() wid: string) {
    return this.campaignsService.findOne(wid, user.id, id);
  }

  @Post(":id/leads")
  addLeads(@Param("id") id: string, @Body() dto: AddLeadsToCampaignDto, @CurrentUser() user: any, @WorkspaceId() wid: string) {
    return this.campaignsService.addLeads(wid, user.id, id, dto);
  }

  @Post(":id/launch")
  launch(@Param("id") id: string, @CurrentUser() user: any, @WorkspaceId() wid: string) {
    return this.campaignsService.launch(wid, user.id, id);
  }

  @Patch(":id/pause")
  pause(@Param("id") id: string, @CurrentUser() user: any, @WorkspaceId() wid: string) {
    return this.campaignsService.pause(wid, user.id, id);
  }

  @Post(":id/schedule")
  schedule(
    @Param("id") id: string,
    @Body() body: { scheduledAt: string },
    @CurrentUser() user: any,
    @WorkspaceId() wid: string,
  ) {
    return this.campaignsService.schedule(wid, user.id, id, new Date(body.scheduledAt));
  }

  @Delete(":id")
  delete(@Param("id") id: string, @CurrentUser() user: any, @WorkspaceId() wid: string) {
    return this.campaignsService.delete(wid, user.id, id);
  }

  @Get(":id/stats")
  stats(@Param("id") id: string, @CurrentUser() user: any, @WorkspaceId() wid: string) {
    return this.campaignsService.getStats(wid, user.id, id);
  }
}
