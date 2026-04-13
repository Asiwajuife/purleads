import { Injectable, NotFoundException, BadRequestException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { WorkspacesService } from "../workspaces/workspaces.service";
import { CreateInboxDto } from "./dto/inbox.dto";

@Injectable()
export class InboxesService {
  constructor(
    private prisma: PrismaService,
    private workspaces: WorkspacesService,
  ) {}

  async create(workspaceId: string, userId: string, dto: CreateInboxDto) {
    await this.workspaces.assertMember(workspaceId, userId);
    const startLimit = dto.warmupEnabled ? (dto.warmupStartLimit ?? 5) : (dto.dailyLimit ?? 50);
    return this.prisma.inbox.create({
      data: {
        ...dto,
        workspaceId,
        smtpPort: dto.smtpPort ?? 587,
        dailyLimit: startLimit,
      },
    });
  }

  async findAll(workspaceId: string, userId: string) {
    await this.workspaces.assertMember(workspaceId, userId);
    return this.prisma.inbox.findMany({
      where: { workspaceId },
      select: {
        id: true, email: true, name: true, smtpHost: true, smtpPort: true, smtpUser: true,
        dailyLimit: true, sentToday: true, isActive: true, domainId: true,
        warmupEnabled: true, warmupStartLimit: true, warmupIncrement: true, warmupMaxLimit: true, warmupDay: true,
      },
    });
  }

  async delete(workspaceId: string, userId: string, inboxId: string) {
    await this.workspaces.assertMember(workspaceId, userId);
    const inbox = await this.prisma.inbox.findFirst({ where: { id: inboxId, workspaceId } });
    if (!inbox) throw new NotFoundException("Inbox not found");
    const logCount = await this.prisma.emailLog.count({ where: { inboxId } });
    if (logCount > 0) throw new BadRequestException("Cannot delete inbox with existing email logs");
    return this.prisma.inbox.delete({ where: { id: inboxId } });
  }

  // Used by worker: find inbox with lowest sentToday that hasn't hit dailyLimit
  async getAvailableInbox(workspaceId: string) {
    const inboxes = await this.prisma.$queryRaw<any[]>`
      SELECT * FROM "Inbox"
      WHERE "workspaceId" = ${workspaceId}
        AND "isActive" = true
        AND "sentToday" < "dailyLimit"
      ORDER BY "sentToday" ASC
      LIMIT 1
    `;
    return inboxes[0] ?? null;
  }

  async incrementSentToday(inboxId: string) {
    return this.prisma.inbox.update({
      where: { id: inboxId },
      data: { sentToday: { increment: 1 } },
    });
  }

  async resetDailyCounts() {
    return this.prisma.inbox.updateMany({ data: { sentToday: 0, resetAt: new Date() } });
  }
}
