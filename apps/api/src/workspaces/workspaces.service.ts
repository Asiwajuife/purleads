import { Injectable, ForbiddenException, NotFoundException, BadRequestException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { CreateWorkspaceDto } from "./dto/workspace.dto";

@Injectable()
export class WorkspacesService {
  constructor(private prisma: PrismaService) {}

  async create(userId: string, dto: CreateWorkspaceDto) {
    const slug = dto.name.toLowerCase().replace(/\s+/g, "-") + "-" + Date.now();
    return this.prisma.workspace.create({
      data: {
        name: dto.name,
        slug,
        members: { create: { userId, role: "ADMIN" } },
      },
    });
  }

  async findAllForUser(userId: string) {
    const memberships = await this.prisma.workspaceMember.findMany({
      where: { userId },
      include: { workspace: true },
    });
    return memberships.map((m) => m.workspace);
  }

  async findOne(workspaceId: string, userId: string) {
    const member = await this.prisma.workspaceMember.findUnique({
      where: { userId_workspaceId: { userId, workspaceId } },
    });
    if (!member) throw new ForbiddenException("Access denied");

    return this.prisma.workspace.findUnique({ where: { id: workspaceId } });
  }

  async delete(workspaceId: string, userId: string) {
    const member = await this.prisma.workspaceMember.findUnique({
      where: { userId_workspaceId: { userId, workspaceId } },
    });
    if (!member) throw new ForbiddenException("Access denied");
    if (member.role !== "ADMIN") throw new ForbiddenException("Only admins can delete a workspace");

    const runningCampaigns = await this.prisma.campaign.count({
      where: { workspaceId, status: "RUNNING" },
    });
    if (runningCampaigns > 0) throw new BadRequestException("Pause all running campaigns before deleting the workspace");

    return this.prisma.workspace.delete({ where: { id: workspaceId } });
  }

  async assertMember(workspaceId: string, userId: string) {
    const member = await this.prisma.workspaceMember.findUnique({
      where: { userId_workspaceId: { userId, workspaceId } },
    });
    if (!member) throw new ForbiddenException("Access denied to workspace");
    return member;
  }
}
