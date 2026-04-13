import { Injectable, BadRequestException } from "@nestjs/common";
import { parse } from "csv-parse/sync";
import { PrismaService } from "../prisma/prisma.service";
import { WorkspacesService } from "../workspaces/workspaces.service";
import { CreateLeadDto } from "./dto/lead.dto";

@Injectable()
export class LeadsService {
  constructor(
    private prisma: PrismaService,
    private workspaces: WorkspacesService,
  ) {}

  async create(workspaceId: string, userId: string, dto: CreateLeadDto) {
    await this.workspaces.assertMember(workspaceId, userId);
    return this.prisma.lead.create({ data: { ...dto, workspaceId } });
  }

  async uploadCsv(workspaceId: string, userId: string, fileBuffer: Buffer) {
    await this.workspaces.assertMember(workspaceId, userId);

    let records: any[];
    try {
      records = parse(fileBuffer, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
      });
    } catch {
      throw new BadRequestException("Invalid CSV file");
    }

    if (!records.length) throw new BadRequestException("CSV file is empty");

    const leads = records.map((row: any) => ({
      workspaceId,
      email: row.email || row.Email || row.EMAIL,
      firstName: row.firstName || row.first_name || row["First Name"] || null,
      lastName: row.lastName || row.last_name || row["Last Name"] || null,
      company: row.company || row.Company || null,
      title: row.title || row.Title || row.position || null,
      website: row.website || row.Website || null,
      phone: row.phone || row.Phone || null,
    }));

    const validLeads = leads.filter((l) => l.email && l.email.includes("@"));
    if (!validLeads.length) throw new BadRequestException("No valid email addresses found in CSV");

    // Upsert to avoid duplicates
    let imported = 0;
    let skipped = 0;
    for (const lead of validLeads) {
      try {
        await this.prisma.lead.upsert({
          where: { workspaceId_email: { workspaceId, email: lead.email } },
          update: { firstName: lead.firstName, lastName: lead.lastName, company: lead.company, title: lead.title },
          create: lead,
        });
        imported++;
      } catch {
        skipped++;
      }
    }

    return { total: validLeads.length, imported, skipped };
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
