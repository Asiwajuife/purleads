import { Controller, Post, Body, Param, NotFoundException } from "@nestjs/common";
import { RepliesService } from "./replies.service";
import { PrismaService } from "../prisma/prisma.service";
import { IsString, IsEmail } from "class-validator";

class InboundReplyDto {
  @IsEmail()
  fromEmail: string;

  @IsString()
  subject: string;

  @IsString()
  body: string;
}

// Public endpoint — no JWT required.
// The workspaceId path param acts as a shared secret (UUID, hard to guess).
// Called by external email/IMAP providers to push inbound replies.
@Controller("replies/inbound")
export class RepliesInboundController {
  constructor(
    private repliesService: RepliesService,
    private prisma: PrismaService,
  ) {}

  @Post(":workspaceId")
  async inbound(@Param("workspaceId") workspaceId: string, @Body() dto: InboundReplyDto) {
    const workspace = await this.prisma.workspace.findUnique({ where: { id: workspaceId } });
    if (!workspace) throw new NotFoundException("Workspace not found");
    return this.repliesService.recordReply(workspaceId, dto.fromEmail, dto.subject, dto.body);
  }
}
