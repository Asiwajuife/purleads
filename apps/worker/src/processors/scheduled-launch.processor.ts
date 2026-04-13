import { PrismaClient } from "@prisma/client";
import { Queue } from "bullmq";
import { EmailJobData } from "./email.processor";

const prisma = new PrismaClient();

export async function processScheduledLaunch(
  data: { campaignId: string; workspaceId: string },
  emailQueue: Queue<EmailJobData>,
) {
  const { campaignId, workspaceId } = data;

  const campaign = await prisma.campaign.findUnique({
    where: { id: campaignId },
    include: {
      sequences: { orderBy: { step: "asc" } },
      leads: { include: { lead: true } },
    },
  });

  if (!campaign || campaign.status !== "DRAFT") {
    console.log(`⏭️  Scheduled launch skipped — campaign ${campaignId} not in DRAFT state`);
    return;
  }

  if (!campaign.sequences.length || !campaign.leads.length) {
    console.log(`⚠️  Scheduled launch cancelled — campaign ${campaignId} has no sequences or leads`);
    return;
  }

  await prisma.campaign.update({
    where: { id: campaignId },
    data: { status: "RUNNING", startedAt: new Date() },
  });

  const firstStep = campaign.sequences[0];
  const baseDelay = firstStep.delayDays * 24 * 60 * 60 * 1000;
  let spreadMs = 0;

  for (const cl of campaign.leads) {
    if (cl.completed) continue;
    const jitter = Math.floor(Math.random() * 240_000) + 60_000;
    spreadMs += jitter;
    await emailQueue.add(
      "send-email",
      {
        campaignLeadId: cl.id,
        campaignId,
        leadId: cl.leadId,
        sequenceId: firstStep.id,
        workspaceId,
        step: 0,
      },
      { delay: baseDelay + spreadMs },
    );
  }

  console.log(`🚀 Scheduled campaign ${campaignId} launched — ${campaign.leads.length} leads queued`);
}
