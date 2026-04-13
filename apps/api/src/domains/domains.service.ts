import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { WorkspacesService } from "../workspaces/workspaces.service";
import { IsString, IsNotEmpty } from "class-validator";

export class CreateDomainDto {
  @IsString()
  @IsNotEmpty()
  name: string;
}

@Injectable()
export class DomainsService {
  constructor(
    private prisma: PrismaService,
    private workspaces: WorkspacesService,
  ) {}

  async create(workspaceId: string, userId: string, name: string) {
    await this.workspaces.assertMember(workspaceId, userId);
    return this.prisma.domain.create({ data: { name, workspaceId } });
  }

  async findAll(workspaceId: string, userId: string) {
    await this.workspaces.assertMember(workspaceId, userId);
    return this.prisma.domain.findMany({ where: { workspaceId } });
  }

  async delete(workspaceId: string, userId: string, domainId: string) {
    await this.workspaces.assertMember(workspaceId, userId);
    return this.prisma.domain.delete({ where: { id: domainId, workspaceId } });
  }
}
