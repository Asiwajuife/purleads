import { Injectable, BadRequestException } from "@nestjs/common";
import { parse } from "csv-parse/sync";
import { PrismaService } from "../prisma/prisma.service";
import { WorkspacesService } from "../workspaces/workspaces.service";
import { EnrichmentService } from "../enrichment/enrichment.service";
import { CreateLeadDto } from "./dto/lead.dto";

function extractDomain(website?: string | null, email?: string | null): string | null {
  if (website) {
    try {
      const url = website.startsWith("http") ? website : `https://${website}`;
      return new URL(url).hostname.replace(/^www\./, "").toLowerCase();
    } catch {}
  }
  if (email && email.includes("@")) {
    const domain = email.split("@")[1]?.toLowerCase();
    // Skip common free/public email domains
    const publicDomains = new Set([
      "gmail.com", "yahoo.com", "hotmail.com", "outlook.com",
      "icloud.com", "aol.com", "protonmail.com", "mail.com",
    ]);
    if (domain && !publicDomains.has(domain)) return domain;
  }
  return null;
}

@Injectable()
export class LeadsService {
  constructor(
    private prisma: PrismaService,
    private workspaces: WorkspacesService,
    private enrichment: EnrichmentService,
  ) {}

  async create(workspaceId: string, userId: string, dto: CreateLeadDto) {
    await this.workspaces.assertMember(workspaceId, userId);
    return this.prisma.lead.create({ data: { ...dto, workspaceId } });
  }

  async uploadCsv(workspaceId: string, userId: string, fileBuffer: Buffer) {
    await this.workspaces.assertMember(workspaceId, userId);

    let records: any[];
    try {
      records = parse(fileBuffer, { columns: true, skip_empty_lines: true, trim: true });
    } catch {
      throw new BadRequestException("Invalid CSV file");
    }

    if (!records.length) throw new BadRequestException("CSV file is empty");

    type ParsedLead = { workspaceId: string; companyUrl: string; website: string; domain: string | null };

    const leads: ParsedLead[] = records
      .map((row: any) => {
        const raw = (
          row.company_url || row.companyUrl || row["Company URL"] || row.url || row.URL || ""
        ).trim();
        if (!raw) return null;
        const companyUrl = raw.startsWith("http") ? raw : `https://${raw}`;
        const domain = extractDomain(companyUrl, null);
        return { workspaceId, companyUrl, website: companyUrl, domain };
      })
      .filter(Boolean) as ParsedLead[];

    if (!leads.length) throw new BadRequestException("No valid company_url values found in CSV");

    const domainLeadsMap = new Map<string, string[]>();
    const leadIds: string[] = [];
    let imported = 0;
    let skipped = 0;

    for (const lead of leads) {
      try {
        const upserted = await this.prisma.lead.upsert({
          where: { workspaceId_companyUrl: { workspaceId, companyUrl: lead.companyUrl } },
          update: { website: lead.website },
          create: { workspaceId, companyUrl: lead.companyUrl, website: lead.website },
        });
        imported++;
        leadIds.push(upserted.id);

        if (lead.domain) {
          const bucket = domainLeadsMap.get(lead.domain) ?? [];
          bucket.push(upserted.id);
          domainLeadsMap.set(lead.domain, bucket);
        }
      } catch {
        skipped++;
      }
    }

    let domainsQueued = 0;
    if (domainLeadsMap.size > 0) {
      domainsQueued = await this.enrichment.scheduleForDomains(workspaceId, domainLeadsMap);
    }

    return { total: leads.length, imported, skipped, domainsQueued, leadIds };
  }

  async findAll(workspaceId: string, userId: string, page = 1, limit = 50) {
    await this.workspaces.assertMember(workspaceId, userId);
    const skip = (page - 1) * limit;
    const [leads, total] = await Promise.all([
      this.prisma.lead.findMany({
        where: { workspaceId },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      this.prisma.lead.count({ where: { workspaceId } }),
    ]);
    return { leads, total, page, limit };
  }

  async delete(workspaceId: string, userId: string, leadId: string) {
    await this.workspaces.assertMember(workspaceId, userId);
    return this.prisma.lead.delete({ where: { id: leadId, workspaceId } });
  }
}
