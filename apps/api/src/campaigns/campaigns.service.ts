import { Injectable, NotFoundException, BadRequestException } from "@nestjs/common";
import { InjectQueue } from "@nestjs/bullmq";
import { Queue } from "bullmq";
import { PrismaService } from "../prisma/prisma.service";
import { WorkspacesService } from "../workspaces/workspaces.service";
import { CreateCampaignDto, AddLeadsToCampaignDto } from "./dto/campaign.dto";

@Injectable()
export class CampaignsService {
  constructor(
    private prisma: PrismaService,
    private workspaces: WorkspacesService,
    @InjectQueue("email-queue") private emailQueue: Queue,
  ) {}

  async create(workspaceId: string, userId: string, dto: CreateCampaignDto) {
    await this.workspaces.assertMember(workspaceId, userId);
    return this.prisma.campaign.create({ data: { ...dto, workspaceId } });
  }

  async findAll(workspaceId: string, userId: string) {
    await this.workspaces.assertMember(workspaceId, userId);
    return this.prisma.campaign.findMany({
      where: { workspaceId },
      include: { _count: { select: { leads: true, sequences: true, emailLogs: true } } },
      orderBy: { createdAt: "desc" },
    });
  }

  async findOne(workspaceId: string, userId: string, campaignId: string) {
    await this.workspaces.assertMember(workspaceId, userId);
    const campaign = await this.prisma.campaign.findFirst({
      where: { id: campaignId, workspaceId },
      include: {
        sequences: { orderBy: { step: "asc" } },
        leads: { include: { lead: true } },
        inbox: { select: { id: true, name: true, email: true } },
      },
    });
    if (!campaign) throw new NotFoundException("Campaign not found");
    return campaign;
  }

  async addLeads(workspaceId: string, userId: string, campaignId: string, dto: AddLeadsToCampaignDto) {
    await this.workspaces.assertMember(workspaceId, userId);
    const data = dto.leadIds.map((leadId) => ({ campaignId, leadId }));
    await this.prisma.campaignLead.createMany({ data, skipDuplicates: true });
    return { added: dto.leadIds.length };
  }

  async launch(workspaceId: string, userId: string, campaignId: string) {
    await this.workspaces.assertMember(workspaceId, userId);

    const campaign = await this.prisma.campaign.findFirst({
      where: { id: campaignId, workspaceId },
      include: {
        sequences: { orderBy: { step: "asc" } },
        leads: { include: { lead: true } },
      },
    });
    if (!campaign) throw new NotFoundException("Campaign not found");
    if (!campaign.sequences.length) throw new NotFoundException("Add at least one sequence step before launching");
    if (!campaign.leads.length) throw new NotFoundException("Add leads before launching");

    const inboxCount = await this.prisma.inbox.count({ where: { workspaceId } });
    if (!inboxCount) throw new NotFoundException("Add at least one email inbox before launching");

    await this.prisma.campaign.update({
      where: { id: campaignId },
      data: { status: "RUNNING", startedAt: new Date() },
    });

    // Assign A/B variants (50/50) before queuing
    const activeLeads = campaign.leads.filter((cl) => !cl.completed);
    for (let i = 0; i < activeLeads.length; i++) {
      await this.prisma.campaignLead.update({
        where: { id: activeLeads[i].id },
        data: { abVariant: i % 2 === 0 ? "A" : "B" },
      });
    }

    // Queue first step for each lead with a random send delay to avoid burst sending.
    // Leads are spread 60–300 seconds apart so they don't all fire at once.
    const firstStep = campaign.sequences[0];
    const baseDelay = firstStep.delayDays * 24 * 60 * 60 * 1000;
    let spreadMs = 0;
    for (const cl of activeLeads) {
      // Add 60–300 seconds between each lead (random to look natural)
      const jitter = Math.floor(Math.random() * 240_000) + 60_000;
      spreadMs += jitter;
      await this.emailQueue.add(
        "send-email",
        {
          campaignLeadId: cl.id,
          campaignId,
          leadId: cl.leadId,
          sequenceId: firstStep.id,
          workspaceId,
          step: 0,
        },
        { delay: baseDelay + spreadMs },
      );
    }

    return { queued: activeLeads.length, firstStep: firstStep.step };
  }

  async pause(workspaceId: string, userId: string, campaignId: string) {
    await this.workspaces.assertMember(workspaceId, userId);
    return this.prisma.campaign.update({
      where: { id: campaignId },
      data: { status: "PAUSED" },
    });
  }

  async schedule(workspaceId: string, userId: string, campaignId: string, scheduledAt: Date) {
    await this.workspaces.assertMember(workspaceId, userId);
    if (scheduledAt <= new Date()) throw new Error("Scheduled time must be in the future");
    const campaign = await this.prisma.campaign.update({
      where: { id: campaignId },
      data: { scheduledAt, status: "DRAFT" },
    });
    // Queue a delayed job that will trigger the launch
    const delay = scheduledAt.getTime() - Date.now();
    await this.emailQueue.add(
      "scheduled-launch",
      { campaignId, workspaceId },
      { delay, jobId: `schedule-${campaignId}` },
    );
    return { scheduledAt, campaignId };
  }

  async delete(workspaceId: string, userId: string, campaignId: string) {
    await this.workspaces.assertMember(workspaceId, userId);
    const campaign = await this.prisma.campaign.findFirst({ where: { id: campaignId, workspaceId } });
    if (!campaign) throw new NotFoundException("Campaign not found");
    if (campaign.status === "RUNNING") throw new BadRequestException("Pause the campaign before deleting it");
    return this.prisma.campaign.delete({ where: { id: campaignId } });
  }

  async getStats(workspaceId: string, userId: string, campaignId: string) {
    await this.workspaces.assertMember(workspaceId, userId);
    const [sent, failed, replies, totalLeads, abRaw] = await Promise.all([
      this.prisma.emailLog.count({ where: { campaignId, workspaceId, status: "SENT" } }),
      this.prisma.emailLog.count({ where: { campaignId, workspaceId, status: "FAILED" } }),
      this.prisma.reply.count({ where: { workspaceId } }),
      this.prisma.campaignLead.count({ where: { campaignId } }),
      this.prisma.emailLog.groupBy({
        by: ["abVariant"],
        where: { campaignId, workspaceId, status: "SENT", abVariant: { not: null } },
        _count: { id: true },
        _sum: { openCount: true },
      }),
    ]);

    const ab = abRaw.map((r) => ({
      variant: r.abVariant,
      sent: r._count.id,
      opens: r._sum.openCount ?? 0,
    }));

    return { sent, failed, replies, totalLeads, ab };
  }
}
