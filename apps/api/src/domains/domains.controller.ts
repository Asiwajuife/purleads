import { Controller, Get, Post, Delete, Body, Param, UseGuards } from "@nestjs/common";
import { DomainsService, CreateDomainDto } from "./domains.service";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { CurrentUser, WorkspaceId } from "../common/decorators/current-user.decorator";

@Controller("domains")
@UseGuards(JwtAuthGuard)
export class DomainsController {
  constructor(private domainsService: DomainsService) {}

  @Post()
  create(@Body() dto: CreateDomainDto, @CurrentUser() user: any, @WorkspaceId() wid: string) {
    return this.domainsService.create(wid, user.id, dto.name);
  }

  @Get()
  findAll(@CurrentUser() user: any, @WorkspaceId() wid: string) {
    return this.domainsService.findAll(wid, user.id);
  }

  @Delete(":id")
  delete(@Param("id") id: string, @CurrentUser() user: any, @WorkspaceId() wid: string) {
    return this.domainsService.delete(wid, user.id, id);
  }
}
