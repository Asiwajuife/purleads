import {
  Controller, Get, Post, Delete, Body, Param, Query,
  UseGuards, UseInterceptors, UploadedFile, ParseIntPipe, DefaultValuePipe,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { LeadsService } from "./leads.service";
import { CreateLeadDto } from "./dto/lead.dto";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { CurrentUser, WorkspaceId } from "../common/decorators/current-user.decorator";

@Controller("leads")
@UseGuards(JwtAuthGuard)
export class LeadsController {
  constructor(private leadsService: LeadsService) {}

  @Post()
  create(
    @Body() dto: CreateLeadDto,
    @CurrentUser() user: any,
    @WorkspaceId() workspaceId: string,
  ) {
    return this.leadsService.create(workspaceId, user.id, dto);
  }

  @Post("upload-csv")
  @UseInterceptors(FileInterceptor("file"))
  uploadCsv(
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: any,
    @WorkspaceId() workspaceId: string,
  ) {
    return this.leadsService.uploadCsv(workspaceId, user.id, file.buffer);
  }

  @Get()
  findAll(
    @CurrentUser() user: any,
    @WorkspaceId() workspaceId: string,
    @Query("page", new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query("limit", new DefaultValuePipe(50), ParseIntPipe) limit: number,
    @Query("search") search?: string,
  ) {
    return this.leadsService.findAll(workspaceId, user.id, page, limit, search);
  }

  @Delete(":id")
  delete(
    @Param("id") id: string,
    @CurrentUser() user: any,
    @WorkspaceId() workspaceId: string,
  ) {
    return this.leadsService.delete(workspaceId, user.id, id);
  }
}
