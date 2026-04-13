import { Controller, Get, Query, UseGuards, DefaultValuePipe, ParseIntPipe } from "@nestjs/common";
import { RepliesService } from "./replies.service";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { CurrentUser, WorkspaceId } from "../common/decorators/current-user.decorator";

@Controller("replies")
@UseGuards(JwtAuthGuard)
export class RepliesController {
  constructor(private repliesService: RepliesService) {}

  @Get()
  findAll(
    @CurrentUser() user: any,
    @WorkspaceId() wid: string,
    @Query("page", new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query("limit", new DefaultValuePipe(50), ParseIntPipe) limit: number,
  ) {
    return this.repliesService.findAll(wid, user.id, page, limit);
  }
}
