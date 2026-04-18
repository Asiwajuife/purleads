import {
  Controller, Get, Param, Query, UseGuards,
  DefaultValuePipe, ParseIntPipe,
} from "@nestjs/common";
import { ContactsService } from "./contacts.service";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { CurrentUser, WorkspaceId } from "../common/decorators/current-user.decorator";

@Controller("contacts")
@UseGuards(JwtAuthGuard)
export class ContactsController {
  constructor(private contactsService: ContactsService) {}

  @Get()
  findAll(
    @CurrentUser() user: any,
    @WorkspaceId() workspaceId: string,
    @Query("page", new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query("limit", new DefaultValuePipe(50), ParseIntPipe) limit: number,
    @Query("search") search?: string,
  ) {
    return this.contactsService.findAll(workspaceId, user.id, page, limit, search);
  }

  @Get("stats")
  stats(@CurrentUser() user: any, @WorkspaceId() workspaceId: string) {
    return this.contactsService.stats(workspaceId, user.id);
  }

  @Get("by-company/:companyId")
  byCompany(
    @Param("companyId") companyId: string,
    @CurrentUser() user: any,
    @WorkspaceId() workspaceId: string,
  ) {
    return this.contactsService.findByCompany(workspaceId, user.id, companyId);
  }
}
