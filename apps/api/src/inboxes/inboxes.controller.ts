import { Controller, Get, Post, Delete, Body, Param, UseGuards } from "@nestjs/common";
import { InboxesService } from "./inboxes.service";
import { CreateInboxDto } from "./dto/inbox.dto";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { CurrentUser, WorkspaceId } from "../common/decorators/current-user.decorator";

@Controller("inboxes")
@UseGuards(JwtAuthGuard)
export class InboxesController {
  constructor(private inboxesService: InboxesService) {}

  @Post()
  create(@Body() dto: CreateInboxDto, @CurrentUser() user: any, @WorkspaceId() wid: string) {
    return this.inboxesService.create(wid, user.id, dto);
  }

  @Get()
  findAll(@CurrentUser() user: any, @WorkspaceId() wid: string) {
    return this.inboxesService.findAll(wid, user.id);
  }

  @Delete(":id")
  delete(@Param("id") id: string, @CurrentUser() user: any, @WorkspaceId() wid: string) {
    return this.inboxesService.delete(wid, user.id, id);
  }
}
