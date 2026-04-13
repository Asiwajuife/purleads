import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { WorkspacesService } from "../workspaces/workspaces.service";
import { WebhooksService } from "../webhooks/webhooks.service";
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

type Sentiment = "INTERESTED" | "OBJECTION" | "NOT_INTERESTED" | "UNSUBSCRIBE" | "OTHER";

async function classifySentiment(subject: string, body: string): Promise<Sentiment> {
  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "user",
          content: `Classify this email reply into exactly one category:
- INTERESTED: wants to learn more, asking for details, open to a call
- OBJECTION: has concerns but not fully closed (wrong time, wrong person, price issue)
- NOT_INTERESTED: clearly declining, no thank you, not relevant
- UNSUBSCRIBE: asking to be removed, stop emailing
- OTHER: out of office, auto-reply, unclear

Subject: ${subject}
Body: ${body.slice(0, 500)}

Reply with ONLY one word: INTERESTED, OBJECTION, NOT_INTERESTED, UNSUBSCRIBE, or OTHER`,
        },
      ],
      max_tokens: 10,
    });
    const text = completion.choices[0].message.content?.trim().toUpperCase() as Sentiment;
    const valid: Sentiment[] = ["INTERESTED", "OBJECTION", "NOT_INTERESTED", "UNSUBSCRIBE", "OTHER"];
    return valid.includes(text) ? text : "OTHER";
  } catch {
    return "OTHER";
  }
}

@Injectable()
export class RepliesService {
  constructor(
    private prisma: PrismaService,
    private workspaces: WorkspacesService,
    private webhooks: WebhooksService,
  ) {}

  async recordReply(workspaceId: string, fromEmail: string, subject: string, body: string) {
    const lead = await this.prisma.lead.findFirst({ where: { workspaceId, email: fromEmail } });
    if (!lead) return null;

    // Classify first so we can set the right lead status
    const sentiment = await classifySentiment(subject, body);

    // UNSUBSCRIBE replies stop future emails; all others just mark as replied
    const newStatus = sentiment === "UNSUBSCRIBE" ? "UNSUBSCRIBED" : "REPLIED";
    await this.prisma.lead.update({ where: { id: lead.id }, data: { status: newStatus } });

    const reply = await this.prisma.reply.create({
      data: { workspaceId, leadId: lead.id, fromEmail, subject, body, sentiment },
    });

    // Fire webhooks asynchronously
    this.webhooks.fire(workspaceId, "reply.received", {
      replyId: reply.id,
      fromEmail,
      subject,
      sentiment,
      leadId: lead.id,
    });

    return reply;
  }

  async findAll(workspaceId: string, userId: string, page = 1, limit = 50) {
    await this.workspaces.assertMember(workspaceId, userId);
    const skip = (page - 1) * limit;
    const [replies, total] = await Promise.all([
      this.prisma.reply.findMany({
        where: { workspaceId },
        include: { lead: { select: { email: true, firstName: true, lastName: true, company: true } } },
        orderBy: { receivedAt: "desc" },
        skip,
        take: limit,
      }),
      this.prisma.reply.count({ where: { workspaceId } }),
    ]);
    return { replies, total, page, limit };
  }
}
