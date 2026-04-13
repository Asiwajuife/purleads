import { Controller, Get, Post, Delete, Body, Param, UseGuards } from "@nestjs/common";
import { WebhooksService } from "./webhooks.service";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { CurrentUser, WorkspaceId } from "../common/decorators/current-user.decorator";

@Controller("webhooks")
@UseGuards(JwtAuthGuard)
export class WebhooksController {
  constructor(private webhooksService: WebhooksService) {}

  @Get()
  findAll(@CurrentUser() user: any, @WorkspaceId() wid: string) {
    return this.webhooksService.findAll(wid, user.id);
  }

  @Post()
  create(
    @Body() body: { url: string; events: string[] },
    @CurrentUser() user: any,
    @WorkspaceId() wid: string,
  ) {
    return this.webhooksService.create(wid, user.id, body.url, body.events);
  }

  @Delete(":id")
  delete(@Param("id") id: string, @CurrentUser() user: any, @WorkspaceId() wid: string) {
    return this.webhooksService.delete(wid, user.id, id);
  }
}
