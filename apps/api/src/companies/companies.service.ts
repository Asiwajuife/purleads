import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { WorkspacesService } from "../workspaces/workspaces.service";

@Injectable()
export class CompaniesService {
  constructor(
    private prisma: PrismaService,
    private workspaces: WorkspacesService,
  ) {}

  async findAll(workspaceId: string, userId: string, page = 1, limit = 50, search?: string) {
    await this.workspaces.assertMember(workspaceId, userId);
    const skip = (page - 1) * limit;
    const where: any = { workspaceId };
    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { domain: { contains: search, mode: "insensitive" } },
        { industry: { contains: search, mode: "insensitive" } },
      ];
    }
    const [companies, total] = await Promise.all([
      this.prisma.company.findMany({
        where,
        include: {
          _count: { select: { contacts: true, leads: true } },
        },
        orderBy: [{ enrichedAt: "desc" }, { createdAt: "desc" }],
        skip,
        take: limit,
      }),
      this.prisma.company.count({ where }),
    ]);
    return { companies, total, page, limit };
  }

  async findOne(workspaceId: string, userId: string, companyId: string) {
    await this.workspaces.assertMember(workspaceId, userId);
    return this.prisma.company.findFirst({
      where: { id: companyId, workspaceId },
      include: {
        contacts: { orderBy: { score: "desc" } },
        _count: { select: { leads: true } },
      },
    });
  }
}
