import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { WorkspacesService } from "../workspaces/workspaces.service";
import { CreateSequenceDto } from "./dto/sequence.dto";

@Injectable()
export class SequencesService {
  constructor(
    private prisma: PrismaService,
    private workspaces: WorkspacesService,
  ) {}

  async create(workspaceId: string, userId: string, campaignId: string, dto: CreateSequenceDto) {
    await this.workspaces.assertMember(workspaceId, userId);
    return this.prisma.sequence.create({
      data: { ...dto, campaignId, delayDays: dto.delayDays ?? 0 },
    });
  }

  async findAll(workspaceId: string, userId: string, campaignId: string) {
    await this.workspaces.assertMember(workspaceId, userId);
    return this.prisma.sequence.findMany({
      where: { campaignId },
      orderBy: { step: "asc" },
    });
  }

  async delete(workspaceId: string, userId: string, sequenceId: string) {
    await this.workspaces.assertMember(workspaceId, userId);
    const sequence = await this.prisma.sequence.findUnique({ where: { id: sequenceId } });
    if (!sequence) throw new NotFoundException("Sequence not found");
    return this.prisma.sequence.delete({ where: { id: sequenceId } });
  }
}
