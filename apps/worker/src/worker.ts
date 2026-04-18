import "dotenv/config";
import { Queue, Worker } from "bullmq";
import IORedis from "ioredis";
import { PrismaClient } from "@prisma/client";
import { processEmailJob, EmailJobData } from "./processors/email.processor";
import { processScheduledLaunch } from "./processors/scheduled-launch.processor";
import { processEnrichJob, EnrichJobData } from "./processors/enrichment.processor";

const connection = new IORedis({
  host: process.env.REDIS_HOST || "localhost",
  port: parseInt(process.env.REDIS_PORT || "6379"),
  password: process.env.REDIS_PASSWORD,
  tls: process.env.REDIS_TLS === "true" ? {} : undefined,
  maxRetriesPerRequest: null,
});

const prisma = new PrismaClient();

// Export for use in processor (next-step queuing)
export const emailQueue = new Queue<EmailJobData>("email-queue", { connection });

const worker = new Worker(
  "email-queue",
  async (job) => {
    if (job.name === "scheduled-launch") {
      console.log(`🗓️  Processing scheduled launch for campaign ${job.data.campaignId}`);
      await processScheduledLaunch(job.data, emailQueue);
    } else if (job.name === "enrich-company") {
      console.log(`🔍 Enriching domain ${job.data.domain} (workspace: ${job.data.workspaceId})`);
      await processEnrichJob(job.data as EnrichJobData);
    } else {
      console.log(`📨 Processing job ${job.id} — lead ${job.data.leadId}`);
      await processEmailJob(job.data as EmailJobData);
    }
  },
  {
    connection,
    concurrency: 5,
  },
);

worker.on("completed", (job) => {
  console.log(`✅ Job ${job.id} completed`);
});

worker.on("failed", (job, err) => {
  console.error(`❌ Job ${job?.id} failed:`, err.message);
});

// Daily reset of inbox sentToday counts (run at midnight)
async function scheduleDailyReset() {
  const now = new Date();
  const midnight = new Date(now);
  midnight.setDate(midnight.getDate() + 1);
  midnight.setHours(0, 0, 0, 0);
  const msUntilMidnight = midnight.getTime() - now.getTime();

  setTimeout(async () => {
    try {
      await prisma.inbox.updateMany({ data: { sentToday: 0, resetAt: new Date() } });
      console.log("🔄 Daily inbox counts reset");

      // Advance warmup for warmup-enabled inboxes
      const warmupInboxes = await prisma.inbox.findMany({ where: { warmupEnabled: true } });
      for (const inbox of warmupInboxes) {
        const newDay = inbox.warmupDay + 1;
        const newLimit = Math.min(inbox.warmupStartLimit + newDay * inbox.warmupIncrement, inbox.warmupMaxLimit);
        await prisma.inbox.update({ where: { id: inbox.id }, data: { warmupDay: newDay, dailyLimit: newLimit } });
      }
      if (warmupInboxes.length > 0) {
        console.log(`🔥 Warmup advanced for ${warmupInboxes.length} inbox(es)`);
      }
    } catch (err: any) {
      console.error("❌ Failed during daily reset:", err.message);
    }
    scheduleDailyReset(); // reschedule for next day
  }, msUntilMidnight);
}

scheduleDailyReset();

console.log("🚀 Purleads worker started — listening for email jobs...");

// Graceful shutdown — finish in-flight jobs before exiting
async function shutdown(signal: string) {
  console.log(`\n${signal} received — shutting down worker gracefully...`);
  await worker.close();
  await emailQueue.close();
  await connection.quit();
  await prisma.$disconnect();
  console.log("Worker shut down cleanly.");
  process.exit(0);
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
