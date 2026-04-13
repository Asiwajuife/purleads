import { Controller, Get, Post, Delete, Param, Body, UseGuards } from "@nestjs/common";
import { InvitesService } from "./invites.service";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { CurrentUser, WorkspaceId } from "../common/decorators/current-user.decorator";

@Controller()
export class InvitesController {
  constructor(private invitesService: InvitesService) {}

  // ─── Workspace-scoped (require auth + workspace header) ──────────────────────

  @Post("workspaces/:id/invites")
  @UseGuards(JwtAuthGuard)
  createInvite(
    @Param("id") workspaceId: string,
    @Body() body: { email: string; role?: "ADMIN" | "MEMBER" },
    @CurrentUser() user: any,
  ) {
    return this.invitesService.createInvite(workspaceId, user.id, body.email, body.role);
  }

  @Get("workspaces/:id/invites")
  @UseGuards(JwtAuthGuard)
  listInvites(@Param("id") workspaceId: string, @CurrentUser() user: any) {
    return this.invitesService.listPendingInvites(workspaceId, user.id);
  }

  @Delete("workspaces/:id/invites/:inviteId")
  @UseGuards(JwtAuthGuard)
  revokeInvite(
    @Param("id") workspaceId: string,
    @Param("inviteId") inviteId: string,
    @CurrentUser() user: any,
  ) {
    return this.invitesService.revokeInvite(workspaceId, user.id, inviteId);
  }

  @Get("workspaces/:id/members")
  @UseGuards(JwtAuthGuard)
  listMembers(@Param("id") workspaceId: string, @CurrentUser() user: any) {
    return this.invitesService.listMembers(workspaceId, user.id);
  }

  @Delete("workspaces/:id/members/:userId")
  @UseGuards(JwtAuthGuard)
  removeMember(
    @Param("id") workspaceId: string,
    @Param("userId") targetUserId: string,
    @CurrentUser() user: any,
  ) {
    return this.invitesService.removeMember(workspaceId, user.id, targetUserId);
  }

  // ─── Public invite endpoints ─────────────────────────────────────────────────

  @Get("invites/:token")
  getInvite(@Param("token") token: string) {
    return this.invitesService.getInvite(token);
  }

  @Post("invites/:token/accept")
  @UseGuards(JwtAuthGuard)
  acceptInvite(@Param("token") token: string, @CurrentUser() user: any) {
    return this.invitesService.acceptInvite(token, user.id);
  }
}
