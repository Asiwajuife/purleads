import { Controller, Post, Get, Delete, Body, Param, UseGuards } from "@nestjs/common";
import { EnrichmentService } from "./enrichment.service";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { CurrentUser, WorkspaceId } from "../common/decorators/current-user.decorator";

@Controller("enrichment")
@UseGuards(JwtAuthGuard)
export class EnrichmentController {
  constructor(private enrichmentService: EnrichmentService) {}

  @Post("trigger")
  trigger(
    @Body() body: { domain: string },
    @CurrentUser() user: any,
    @WorkspaceId() workspaceId: string,
  ) {
    return this.enrichmentService.triggerManual(workspaceId, user.id, body.domain);
  }

  @Get("status")
  status(@CurrentUser() user: any, @WorkspaceId() workspaceId: string) {
    return this.enrichmentService.getStatus(workspaceId, user.id);
  }

  // ─── Provider CRUD ────────────────────────────────────────────────────────

  @Get("providers")
  getProviders(@CurrentUser() user: any, @WorkspaceId() workspaceId: string) {
    return this.enrichmentService.getProviders(workspaceId, user.id);
  }

  @Post("providers")
  upsertProvider(
    @Body() body: { name: string; displayName: string; credentials: Record<string, string> },
    @CurrentUser() user: any,
    @WorkspaceId() workspaceId: string,
  ) {
    return this.enrichmentService.upsertProvider(workspaceId, user.id, body);
  }

  @Delete("providers/:name")
  deleteProvider(
    @Param("name") name: string,
    @CurrentUser() user: any,
    @WorkspaceId() workspaceId: string,
  ) {
    return this.enrichmentService.deleteProvider(workspaceId, user.id, name);
  }
}
