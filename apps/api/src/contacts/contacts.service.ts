import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { WorkspacesService } from "../workspaces/workspaces.service";

@Injectable()
export class ContactsService {
  constructor(
    private prisma: PrismaService,
    private workspaces: WorkspacesService,
  ) {}

  async findAll(
    workspaceId: string,
    userId: string,
    page = 1,
    limit = 50,
    search?: string,
  ) {
    await this.workspaces.assertMember(workspaceId, userId);
    const skip = (page - 1) * limit;
    const where: any = { workspaceId };
    if (search) {
      where.OR = [
        { email: { contains: search, mode: "insensitive" } },
        { firstName: { contains: search, mode: "insensitive" } },
        { lastName: { contains: search, mode: "insensitive" } },
        { jobTitle: { contains: search, mode: "insensitive" } },
        { company: { name: { contains: search, mode: "insensitive" } } },
      ];
    }
    const [contacts, total] = await Promise.all([
      this.prisma.contact.findMany({
        where,
        include: {
          company: { select: { id: true, name: true, domain: true, industry: true } },
        },
        orderBy: [{ score: "desc" }, { createdAt: "desc" }],
        skip,
        take: limit,
      }),
      this.prisma.contact.count({ where }),
    ]);
    return { contacts, total, page, limit };
  }

  async findByCompany(workspaceId: string, userId: string, companyId: string) {
    await this.workspaces.assertMember(workspaceId, userId);
    return this.prisma.contact.findMany({
      where: { workspaceId, companyId },
      orderBy: { score: "desc" },
    });
  }

  async stats(workspaceId: string, userId: string) {
    await this.workspaces.assertMember(workspaceId, userId);
    const [totalContacts, enrichedLeads, pendingLeads, failedLeads, totalCompanies] = await Promise.all([
      this.prisma.contact.count({ where: { workspaceId } }),
      this.prisma.lead.count({ where: { workspaceId, enrichmentStatus: "ENRICHED" } }),
      this.prisma.lead.count({ where: { workspaceId, enrichmentStatus: "PENDING" } }),
      this.prisma.lead.count({ where: { workspaceId, enrichmentStatus: "FAILED" } }),
      this.prisma.company.count({ where: { workspaceId } }),
    ]);
    return { totalContacts, enrichedLeads, pendingLeads, failedLeads, totalCompanies };
  }
}
