import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { WorkspacesService } from "../workspaces/workspaces.service";

// 1x1 transparent GIF
export const TRACKING_PIXEL = Buffer.from(
  "R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7",
  "base64",
);

@Injectable()
export class EmailsService {
  constructor(
    private prisma: PrismaService,
    private workspaces: WorkspacesService,
  ) {}

  async getLogs(workspaceId: string, userId: string, page = 1, limit = 50) {
    await this.workspaces.assertMember(workspaceId, userId);
    const skip = (page - 1) * limit;
    const [logs, total] = await Promise.all([
      this.prisma.emailLog.findMany({
        where: { workspaceId },
        include: { lead: { select: { email: true, firstName: true, lastName: true } } },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      this.prisma.emailLog.count({ where: { workspaceId } }),
    ]);
    return { logs, total, page, limit };
  }

  async getWorkspaceStats(workspaceId: string, userId: string) {
    await this.workspaces.assertMember(workspaceId, userId);
    const [totalSent, totalFailed, totalLeads, totalCampaigns, totalReplies, totalOpens] = await Promise.all([
      this.prisma.emailLog.count({ where: { workspaceId, status: "SENT" } }),
      this.prisma.emailLog.count({ where: { workspaceId, status: "FAILED" } }),
      this.prisma.lead.count({ where: { workspaceId } }),
      this.prisma.campaign.count({ where: { workspaceId } }),
      this.prisma.reply.count({ where: { workspaceId } }),
      this.prisma.emailLog.count({ where: { workspaceId, openedAt: { not: null } } }),
    ]);
    const replyRate = totalSent > 0 ? ((totalReplies / totalSent) * 100).toFixed(1) : "0";
    const openRate = totalSent > 0 ? ((totalOpens / totalSent) * 100).toFixed(1) : "0";
    return { totalSent, totalFailed, totalLeads, totalCampaigns, totalReplies, totalOpens, replyRate, openRate };
  }

  // Called by the tracking pixel endpoint — no auth
  async recordOpen(emailLogId: string) {
    try {
      const log = await this.prisma.emailLog.findUnique({ where: { id: emailLogId }, select: { openedAt: true } });
      if (!log) return;
      await this.prisma.emailLog.update({
        where: { id: emailLogId },
        data: {
          openedAt: log.openedAt ?? new Date(), // preserve first-open timestamp
          openCount: { increment: 1 },
        },
      });
    } catch {
      // Ignore — don't error on pixel requests
    }
  }

  // Called by the unsubscribe endpoint — no auth
  async unsubscribeLead(token: string): Promise<{ email: string }> {
    const lead = await this.prisma.lead.findUnique({ where: { unsubscribeToken: token } });
    if (!lead) throw new NotFoundException("Invalid unsubscribe link");
    await this.prisma.lead.update({
      where: { id: lead.id },
      data: { status: "UNSUBSCRIBED" },
    });
    return { email: lead.email ?? "" };
  }
}
