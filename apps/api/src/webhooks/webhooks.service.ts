import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { WorkspacesService } from "../workspaces/workspaces.service";
import * as crypto from "crypto";

@Injectable()
export class WebhooksService {
  constructor(
    private prisma: PrismaService,
    private workspaces: WorkspacesService,
  ) {}

  async create(workspaceId: string, userId: string, url: string, events: string[]) {
    await this.workspaces.assertMember(workspaceId, userId);
    const secret = crypto.randomBytes(24).toString("hex");
    return this.prisma.webhook.create({
      data: { workspaceId, url, events, secret },
    });
  }

  async findAll(workspaceId: string, userId: string) {
    await this.workspaces.assertMember(workspaceId, userId);
    return this.prisma.webhook.findMany({
      where: { workspaceId },
      select: { id: true, url: true, events: true, isActive: true, createdAt: true, secret: true },
    });
  }

  async delete(workspaceId: string, userId: string, webhookId: string) {
    await this.workspaces.assertMember(workspaceId, userId);
    return this.prisma.webhook.delete({ where: { id: webhookId } });
  }

  // Fire webhooks for a given event — called internally
  async fire(workspaceId: string, event: string, payload: Record<string, any>) {
    const hooks = await this.prisma.webhook.findMany({
      where: { workspaceId, isActive: true, events: { has: event } },
    });

    for (const hook of hooks) {
      try {
        const body = JSON.stringify({ event, payload, timestamp: new Date().toISOString() });
        const sig = hook.secret
          ? crypto.createHmac("sha256", hook.secret).update(body).digest("hex")
          : undefined;

        const headers: Record<string, string> = { "Content-Type": "application/json" };
        if (sig) headers["X-Purleads-Signature"] = `sha256=${sig}`;

        await fetch(hook.url, { method: "POST", headers, body, signal: AbortSignal.timeout(5000) });
      } catch {
        // Don't fail the main request if webhook delivery fails
      }
    }
  }
}
