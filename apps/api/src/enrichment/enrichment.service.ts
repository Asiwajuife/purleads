import { Injectable } from "@nestjs/common";
import { InjectQueue } from "@nestjs/bullmq";
import { Queue } from "bullmq";
import { PrismaService } from "../prisma/prisma.service";
import { WorkspacesService } from "../workspaces/workspaces.service";

export interface EnrichJobData {
  domain: string;
  workspaceId: string;
  leadIds: string[];
}

function maskCredentials(creds: Record<string, string>): Record<string, string> {
  const masked: Record<string, string> = {};
  for (const [key, val] of Object.entries(creds)) {
    if (typeof val === "string" && val.length > 4) {
      masked[key] = "••••" + val.slice(-4);
    } else {
      masked[key] = "••••••••";
    }
  }
  return masked;
}

@Injectable()
export class EnrichmentService {
  constructor(
    private prisma: PrismaService,
    private workspaces: WorkspacesService,
    @InjectQueue("email-queue") private queue: Queue,
  ) {}

  // ─── Provider CRUD ─────────────────────────────────────────────────────────

  async getProviders(workspaceId: string, userId: string) {
    await this.workspaces.assertMember(workspaceId, userId);
    const providers = await this.prisma.enrichmentProvider.findMany({
      where: { workspaceId },
      orderBy: { createdAt: "asc" },
    });
    return providers.map((p) => ({
      id: p.id,
      name: p.name,
      displayName: p.displayName,
      enabled: p.enabled,
      updatedAt: p.updatedAt,
      credentials: maskCredentials(p.credentials as Record<string, string>),
    }));
  }

  async upsertProvider(
    workspaceId: string,
    userId: string,
    data: { name: string; displayName: string; credentials: Record<string, string> },
  ) {
    await this.workspaces.assertMember(workspaceId, userId);
    const provider = await this.prisma.enrichmentProvider.upsert({
      where: { workspaceId_name: { workspaceId, name: data.name } },
      create: {
        workspaceId,
        name: data.name,
        displayName: data.displayName,
        credentials: data.credentials,
        enabled: true,
      },
      update: {
        displayName: data.displayName,
        credentials: data.credentials,
        enabled: true,
      },
    });
    return {
      id: provider.id,
      name: provider.name,
      displayName: provider.displayName,
      enabled: provider.enabled,
      updatedAt: provider.updatedAt,
    };
  }

  async deleteProvider(workspaceId: string, userId: string, name: string) {
    await this.workspaces.assertMember(workspaceId, userId);
    await this.prisma.enrichmentProvider.deleteMany({ where: { workspaceId, name } });
    return { deleted: true };
  }

  // ─── Queue management ──────────────────────────────────────────────────────

  async scheduleForDomains(workspaceId: string, domainLeadsMap: Map<string, string[]>): Promise<number> {
    let queued = 0;
    for (const [domain, leadIds] of domainLeadsMap) {
      await this.queue.add(
        "enrich-company",
        { domain, workspaceId, leadIds } as EnrichJobData,
        {
          jobId: `enrich:${workspaceId}:${domain}`,
          attempts: 3,
          backoff: { type: "exponential", delay: 5000 },
        },
      );
      if (leadIds.length) {
        await this.prisma.lead.updateMany({
          where: { id: { in: leadIds }, workspaceId },
          data: { enrichmentStatus: "PENDING" },
        });
      }
      queued++;
    }
    return queued;
  }

  async triggerManual(workspaceId: string, userId: string, domain: string) {
    await this.workspaces.assertMember(workspaceId, userId);
    const leads = await this.prisma.lead.findMany({
      where: {
        workspaceId,
        OR: [
          { website: { contains: domain, mode: "insensitive" } },
          { email: { endsWith: `@${domain}` } },
        ],
      },
      select: { id: true },
    });
    const leadIds = leads.map((l) => l.id);
    const domainMap = new Map([[domain, leadIds]]);
    const queued = await this.scheduleForDomains(workspaceId, domainMap);
    return { queued: queued > 0, domain, leadsTagged: leadIds.length };
  }

  async getStatus(workspaceId: string, userId: string) {
    await this.workspaces.assertMember(workspaceId, userId);
    const [none, pending, enriched, failed] = await Promise.all([
      this.prisma.lead.count({ where: { workspaceId, enrichmentStatus: "NONE" } }),
      this.prisma.lead.count({ where: { workspaceId, enrichmentStatus: "PENDING" } }),
      this.prisma.lead.count({ where: { workspaceId, enrichmentStatus: "ENRICHED" } }),
      this.prisma.lead.count({ where: { workspaceId, enrichmentStatus: "FAILED" } }),
    ]);
    return { none, pending, enriched, failed };
  }
}
