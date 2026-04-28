import { Injectable, NotFoundException, BadRequestException, InternalServerErrorException } from "@nestjs/common";
import * as nodemailer from "nodemailer";
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

  async sendManual(
    workspaceId: string,
    userId: string,
    dto: { leadId: string; campaignId: string; sequenceId: string; inboxId: string },
  ) {
    await this.workspaces.assertMember(workspaceId, userId);

    const [lead, campaign, sequence, inbox] = await Promise.all([
      this.prisma.lead.findFirst({ where: { id: dto.leadId, workspaceId } }),
      this.prisma.campaign.findFirst({ where: { id: dto.campaignId, workspaceId } }),
      this.prisma.sequence.findFirst({ where: { id: dto.sequenceId, campaign: { workspaceId } } }),
      this.prisma.inbox.findFirst({ where: { id: dto.inboxId, workspaceId } }),
    ]);

    if (!lead) throw new NotFoundException("Lead not found");
    if (!lead.email) throw new BadRequestException("Lead has no email address");
    if (!campaign) throw new NotFoundException("Campaign not found");
    if (!sequence) throw new NotFoundException("Sequence step not found");
    if (!inbox) throw new NotFoundException("Inbox not found");

    const fullName = [lead.firstName, lead.lastName].filter(Boolean).join(" ") || "there";
    function applyVars(text: string) {
      return text
        .replace(/\{\{firstName\}\}/gi, lead!.firstName || fullName)
        .replace(/\{\{name\}\}/gi, fullName)
        .replace(/\{\{company\}\}/gi, lead!.company || "")
        .replace(/\{\{title\}\}/gi, lead!.title || "")
        .replace(/\{\{company_name\}\}/gi, lead!.company || "")
        .replace(/\{\{icebreaker\}\}/gi, "");
    }

    const subject = applyVars(sequence.subject);
    const body = applyVars(sequence.body);

    const emailLog = await this.prisma.emailLog.create({
      data: {
        workspaceId,
        campaignId: dto.campaignId,
        leadId: dto.leadId,
        sequenceId: dto.sequenceId,
        inboxId: dto.inboxId,
        to: lead.email,
        subject,
        body,
        status: "PENDING",
      },
    });

    const API_URL = process.env.API_URL || "http://localhost:3001";
    const unsubscribeUrl = `${API_URL}/api/emails/unsubscribe/${lead.unsubscribeToken}`;
    const trackingPixelUrl = `${API_URL}/api/emails/track/${emailLog.id}`;
    const htmlBody = this.buildHtml(body, unsubscribeUrl, trackingPixelUrl);

    try {
      const transporter = nodemailer.createTransport({
        host: inbox.smtpHost,
        port: inbox.smtpPort,
        secure: inbox.smtpPort === 465,
        auth: { user: inbox.smtpUser, pass: inbox.smtpPass },
      });

      const info = await transporter.sendMail({
        from: `"${campaign.fromName || inbox.name}" <${inbox.email}>`,
        to: lead.email,
        replyTo: campaign.replyTo || inbox.email,
        subject,
        html: htmlBody,
        text: body + `\n\n---\nUnsubscribe: ${unsubscribeUrl}`,
      });

      await Promise.all([
        this.prisma.emailLog.update({ where: { id: emailLog.id }, data: { status: "SENT", sentAt: new Date() } }),
        this.prisma.inbox.update({ where: { id: inbox.id }, data: { sentToday: { increment: 1 } } }),
      ]);

      return { success: true, messageId: info.messageId };
    } catch (err: any) {
      await this.prisma.emailLog.update({
        where: { id: emailLog.id },
        data: { status: "FAILED", error: err.message },
      });
      throw new InternalServerErrorException(err.message || "Failed to send email");
    }
  }

  private buildHtml(body: string, unsubscribeUrl: string, trackingPixelUrl: string): string {
    const isHtml = body.trim().startsWith("<") || /<[a-z][\s\S]*>/i.test(body);
    const htmlBody = isHtml
      ? body
      : body
          .replace(/&/g, "&amp;")
          .replace(/</g, "&lt;")
          .replace(/>/g, "&gt;")
          .replace(/\n/g, "<br>");
    return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:15px;line-height:1.6;color:#1a1a1a;max-width:600px;margin:0 auto;padding:20px">
  <div style="margin-bottom:32px">${htmlBody}</div>
  <div style="border-top:1px solid #e5e7eb;margin-top:32px;padding-top:16px;font-size:12px;color:#9ca3af">
    <p style="margin:0">If you'd prefer not to receive emails like this, you can <a href="${unsubscribeUrl}" style="color:#6b7280">unsubscribe here</a>.</p>
  </div>
  <img src="${trackingPixelUrl}" width="1" height="1" style="display:none" alt="">
</body>
</html>`;
  }

  async sendCompose(
    workspaceId: string,
    userId: string,
    dto: {
      campaignId: string;
      sequenceId: string;
      email: string;
      cc?: string;
      firstName?: string;
      lastName?: string;
      company?: string;
    },
  ) {
    await this.workspaces.assertMember(workspaceId, userId);

    const [campaign, sequence] = await Promise.all([
      this.prisma.campaign.findFirst({ where: { id: dto.campaignId, workspaceId }, include: { inbox: true } }),
      this.prisma.sequence.findFirst({ where: { id: dto.sequenceId, campaign: { workspaceId } } }),
    ]);

    if (!campaign) throw new NotFoundException("Campaign not found");
    if (!sequence) throw new NotFoundException("Sequence step not found");

    // Resolve inbox: campaign's inbox → first active inbox in workspace
    let inbox = campaign.inbox ?? null;
    if (!inbox) {
      inbox = await this.prisma.inbox.findFirst({ where: { workspaceId, isActive: true } });
    }
    if (!inbox) throw new BadRequestException("No active inbox found. Connect an inbox first.");

    // Find or create lead so EmailLog always has a valid leadId
    let lead = await this.prisma.lead.findFirst({ where: { workspaceId, email: dto.email } });
    if (!lead) {
      lead = await this.prisma.lead.create({
        data: {
          workspaceId,
          email: dto.email,
          firstName: dto.firstName || null,
          lastName: dto.lastName || null,
          company: dto.company || null,
        },
      });
    }

    const fullName = [dto.firstName, dto.lastName].filter(Boolean).join(" ") || "there";
    function applyVars(text: string) {
      return text
        .replace(/\{\{firstName\}\}/gi, dto.firstName || fullName)
        .replace(/\{\{name\}\}/gi, fullName)
        .replace(/\{\{company\}\}/gi, dto.company || "")
        .replace(/\{\{company_name\}\}/gi, dto.company || "")
        .replace(/\{\{title\}\}/gi, "")
        .replace(/\{\{icebreaker\}\}/gi, "");
    }

    const subject = applyVars(sequence.subject);
    const body = applyVars(sequence.body);

    const emailLog = await this.prisma.emailLog.create({
      data: {
        workspaceId,
        campaignId: dto.campaignId,
        leadId: lead.id,
        sequenceId: dto.sequenceId,
        inboxId: inbox.id,
        to: dto.email,
        cc: dto.cc || null,
        subject,
        body,
        status: "PENDING",
      },
    });

    const API_URL = process.env.API_URL || "http://localhost:3001";
    const unsubscribeUrl = `${API_URL}/api/emails/unsubscribe/${lead.unsubscribeToken}`;
    const trackingPixelUrl = `${API_URL}/api/emails/track/${emailLog.id}`;
    const htmlBody = this.buildHtml(body, unsubscribeUrl, trackingPixelUrl);

    try {
      const transporter = nodemailer.createTransport({
        host: inbox.smtpHost,
        port: inbox.smtpPort,
        secure: inbox.smtpPort === 465,
        auth: { user: inbox.smtpUser, pass: inbox.smtpPass },
      });

      const mailOptions: any = {
        from: `"${campaign.fromName || inbox.name}" <${inbox.email}>`,
        to: dto.email,
        replyTo: campaign.replyTo || inbox.email,
        subject,
        html: htmlBody,
        text: body + `\n\n---\nUnsubscribe: ${unsubscribeUrl}`,
      };
      if (dto.cc) mailOptions.cc = dto.cc;

      const info = await transporter.sendMail(mailOptions);

      await Promise.all([
        this.prisma.emailLog.update({ where: { id: emailLog.id }, data: { status: "SENT", sentAt: new Date() } }),
        this.prisma.inbox.update({ where: { id: inbox.id }, data: { sentToday: { increment: 1 } } }),
      ]);

      return { success: true, messageId: info.messageId };
    } catch (err: any) {
      await this.prisma.emailLog.update({
        where: { id: emailLog.id },
        data: { status: "FAILED", error: err.message },
      });
      throw new InternalServerErrorException(err.message || "Failed to send email");
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
