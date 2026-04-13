import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class InvitesService {
  constructor(private prisma: PrismaService) {}

  async createInvite(workspaceId: string, userId: string, email: string, role: "ADMIN" | "MEMBER" = "MEMBER") {
    // Only admins can invite
    const member = await this.prisma.workspaceMember.findUnique({
      where: { userId_workspaceId: { userId, workspaceId } },
    });
    if (!member) throw new ForbiddenException("Access denied");
    if (member.role !== "ADMIN") throw new ForbiddenException("Only admins can invite members");

    // Expire any existing pending invite for this email
    await this.prisma.workspaceInvite.updateMany({
      where: { workspaceId, email, acceptedAt: null },
      data: { expiresAt: new Date() },
    });

    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
    const invite = await this.prisma.workspaceInvite.create({
      data: { workspaceId, email, role, expiresAt },
      include: { workspace: { select: { name: true } } },
    });
    return invite;
  }

  async getInvite(token: string) {
    const invite = await this.prisma.workspaceInvite.findUnique({
      where: { token },
      include: { workspace: { select: { name: true } } },
    });
    if (!invite) throw new NotFoundException("Invite not found");
    if (invite.acceptedAt) throw new BadRequestException("Invite already accepted");
    if (invite.expiresAt < new Date()) throw new BadRequestException("Invite has expired");
    return invite;
  }

  async acceptInvite(token: string, userId: string) {
    const invite = await this.getInvite(token);

    // Check if already a member
    const existing = await this.prisma.workspaceMember.findUnique({
      where: { userId_workspaceId: { userId, workspaceId: invite.workspaceId } },
    });
    if (existing) throw new BadRequestException("You are already a member of this workspace");

    // Add to workspace
    await this.prisma.workspaceMember.create({
      data: { userId, workspaceId: invite.workspaceId, role: invite.role },
    });

    await this.prisma.workspaceInvite.update({
      where: { token },
      data: { acceptedAt: new Date() },
    });

    return { workspaceId: invite.workspaceId, role: invite.role };
  }

  async listMembers(workspaceId: string, userId: string) {
    const member = await this.prisma.workspaceMember.findUnique({
      where: { userId_workspaceId: { userId, workspaceId } },
    });
    if (!member) throw new ForbiddenException("Access denied");

    return this.prisma.workspaceMember.findMany({
      where: { workspaceId },
      include: { user: { select: { id: true, name: true, email: true } } },
      orderBy: { createdAt: "asc" },
    });
  }

  async removeMember(workspaceId: string, adminId: string, targetUserId: string) {
    const admin = await this.prisma.workspaceMember.findUnique({
      where: { userId_workspaceId: { userId: adminId, workspaceId } },
    });
    if (!admin) throw new ForbiddenException("Access denied");
    if (admin.role !== "ADMIN") throw new ForbiddenException("Only admins can remove members");
    if (adminId === targetUserId) throw new BadRequestException("You cannot remove yourself");

    await this.prisma.workspaceMember.deleteMany({
      where: { workspaceId, userId: targetUserId },
    });
    return { removed: true };
  }

  async listPendingInvites(workspaceId: string, userId: string) {
    const member = await this.prisma.workspaceMember.findUnique({
      where: { userId_workspaceId: { userId, workspaceId } },
    });
    if (!member) throw new ForbiddenException("Access denied");

    return this.prisma.workspaceInvite.findMany({
      where: { workspaceId, acceptedAt: null, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: "desc" },
    });
  }

  async revokeInvite(workspaceId: string, adminId: string, inviteId: string) {
    const admin = await this.prisma.workspaceMember.findUnique({
      where: { userId_workspaceId: { userId: adminId, workspaceId } },
    });
    if (!admin || admin.role !== "ADMIN") throw new ForbiddenException("Only admins can revoke invites");

    await this.prisma.workspaceInvite.updateMany({
      where: { id: inviteId, workspaceId },
      data: { expiresAt: new Date() },
    });
    return { revoked: true };
  }
}
