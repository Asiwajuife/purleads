import {
  Controller, Get, Param, Query, UseGuards,
  DefaultValuePipe, ParseIntPipe,
} from "@nestjs/common";
import { CompaniesService } from "./companies.service";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { CurrentUser, WorkspaceId } from "../common/decorators/current-user.decorator";

@Controller("companies")
@UseGuards(JwtAuthGuard)
export class CompaniesController {
  constructor(private companiesService: CompaniesService) {}

  @Get()
  findAll(
    @CurrentUser() user: any,
    @WorkspaceId() workspaceId: string,
    @Query("page", new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query("limit", new DefaultValuePipe(50), ParseIntPipe) limit: number,
    @Query("search") search?: string,
  ) {
    return this.companiesService.findAll(workspaceId, user.id, page, limit, search);
  }

  @Get(":id")
  findOne(
    @Param("id") id: string,
    @CurrentUser() user: any,
    @WorkspaceId() workspaceId: string,
  ) {
    return this.companiesService.findOne(workspaceId, user.id, id);
  }
}
