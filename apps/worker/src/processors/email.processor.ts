import * as nodemailer from "nodemailer";
import OpenAI from "openai";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const API_URL = process.env.API_URL || "http://localhost:3001";

export interface EmailJobData {
  campaignLeadId: string;
  campaignId: string;
  leadId: string;
  sequenceId: string;
  workspaceId: string;
  step: number;
}

// ─── Bounce classification ──────────────────────────────────────────────────
// Hard bounces = permanent failures → mark lead BOUNCED, don't retry
const HARD_BOUNCE_CODES = [550, 551, 552, 553, 554, 421];
const HARD_BOUNCE_PATTERNS = [
  /user unknown/i,
  /no such user/i,
  /invalid address/i,
  /address rejected/i,
  /does not exist/i,
  /mailbox not found/i,
  /account does not exist/i,
];

function isHardBounce(err: any): boolean {
  const code = err?.responseCode ?? err?.code;
  if (HARD_BOUNCE_CODES.includes(code)) return true;
  const msg = err?.message ?? "";
  return HARD_BOUNCE_PATTERNS.some((p) => p.test(msg));
}

// ─── Decision maker lookup ──────────────────────────────────────────────────
interface DMContact {
  firstName?: string | null;
  lastName?: string | null;
  email: string;
  jobTitle?: string | null;
  linkedinUrl?: string | null;
}

async function getDecisionMakers(
  workspaceId: string,
  companyId: string | null | undefined,
): Promise<{ dm1: DMContact | null; dm2: DMContact | null }> {
  if (!companyId) return { dm1: null, dm2: null };
  const contacts = await prisma.contact.findMany({
    where: { workspaceId, companyId },
    orderBy: { score: "desc" },
    take: 2,
    select: { firstName: true, lastName: true, email: true, jobTitle: true, linkedinUrl: true },
  });
  return { dm1: contacts[0] ?? null, dm2: contacts[1] ?? null };
}

// ─── AI personalization ─────────────────────────────────────────────────────
async function generatePersonalizedEmail(
  subject: string,
  bodyTemplate: string,
  lead: { company?: string | null; website?: string | null },
  dm1: DMContact | null,
  dm2: DMContact | null,
): Promise<{ subject: string; body: string }> {
  const dm1Name = [dm1?.firstName, dm1?.lastName].filter(Boolean).join(" ") || "there";
  const dm2Name = [dm2?.firstName, dm2?.lastName].filter(Boolean).join(" ") || "";
  const company = lead.company || "your company";
  const title = dm1?.jobTitle || "professional";
  const website = lead.website ? `Website: ${lead.website}` : "";
  const linkedin = dm1?.linkedinUrl ? `LinkedIn: ${dm1.linkedinUrl}` : "";

  function applyVars(text: string) {
    return text
      .replace(/\{\{name\}\}/gi, dm1Name)
      .replace(/\{\{firstName\}\}/gi, dm1?.firstName || dm1Name)
      .replace(/\{\{company\}\}/gi, company)
      .replace(/\{\{company_name\}\}/gi, company)
      .replace(/\{\{company_website\}\}/gi, lead.website || "")
      .replace(/\{\{title\}\}/gi, title)
      .replace(/\{\{decision_maker_1_name\}\}/gi, dm1Name)
      .replace(/\{\{decision_maker_1_title\}\}/gi, dm1?.jobTitle || "")
      .replace(/\{\{decision_maker_1_email\}\}/gi, dm1?.email || "")
      .replace(/\{\{decision_maker_2_name\}\}/gi, dm2Name)
      .replace(/\{\{decision_maker_2_title\}\}/gi, dm2?.jobTitle || "")
      .replace(/\{\{decision_maker_2_email\}\}/gi, dm2?.email || "");
  }

  try {
    const prompt = `You are an expert cold email writer. Your job is two things:
1. Write a short, natural icebreaker (1 sentence) that feels personally researched for this lead.
2. Personalize the email template for them.

Lead info:
- Name: ${dm1Name}
- Title: ${title}
- Company: ${company}
${website}
${linkedin}

Email subject template: ${subject}
Email body template: ${bodyTemplate}

Rules:
- Icebreaker must feel genuine, not generic (reference their company/title/role)
- Keep body concise and professional (under 120 words)
- Replace {{icebreaker}} placeholder in the template with your generated icebreaker if present
- Otherwise prepend the icebreaker as the first line of the body
- Return ONLY valid JSON: {"subject": "...", "body": "...", "icebreaker": "..."}`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
      max_tokens: 600,
    });

    const result = JSON.parse(completion.choices[0].message.content || "{}");
    return {
      subject: result.subject || applyVars(subject),
      body: result.body || applyVars(bodyTemplate),
    };
  } catch {
    return {
      subject: applyVars(subject),
      body: applyVars(bodyTemplate),
    };
  }
}

// ─── Build HTML email ───────────────────────────────────────────────────────
function buildHtmlEmail(body: string, unsubscribeUrl: string, trackingPixelUrl: string): string {
  const isHtml = body.trim().startsWith("<") || /<[a-z][\s\S]*>/i.test(body);
  const htmlBody = isHtml
    ? body
    : body
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/\n/g, "<br>");

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:15px;line-height:1.6;color:#1a1a1a;max-width:600px;margin:0 auto;padding:20px">
  <div style="margin-bottom:32px">${htmlBody}</div>
  <div style="border-top:1px solid #e5e7eb;margin-top:32px;padding-top:16px;font-size:12px;color:#9ca3af">
    <p style="margin:0">
      If you'd prefer not to receive emails like this, you can
      <a href="${unsubscribeUrl}" style="color:#6b7280">unsubscribe here</a>.
    </p>
  </div>
  <img src="${trackingPixelUrl}" width="1" height="1" style="display:none" alt="">
</body>
</html>`;
}

// ─── Inbox selection ────────────────────────────────────────────────────────
async function getAvailableInbox(workspaceId: string) {
  const inboxes = await prisma.$queryRaw<any[]>`
    SELECT * FROM inboxes
    WHERE "workspaceId" = ${workspaceId}
      AND "isActive" = true
      AND "sentToday" < "dailyLimit"
    ORDER BY "sentToday" ASC
    LIMIT 1
  `;
  return inboxes[0] ?? null;
}

// ─── Main job processor ─────────────────────────────────────────────────────
export async function processEmailJob(data: EmailJobData) {
  const { campaignLeadId, campaignId, leadId, sequenceId, workspaceId, step } = data;

  // Auto-stop: lead replied or unsubscribed
  const lead = await prisma.lead.findUnique({ where: { id: leadId } });
  if (!lead) throw new Error(`Lead ${leadId} not found`);
  if (lead.status === "REPLIED" || lead.status === "UNSUBSCRIBED" || lead.status === "BOUNCED") {
    await prisma.campaignLead.update({ where: { id: campaignLeadId }, data: { completed: true } });
    console.log(`⏭️  Skipping lead ${leadId} — status: ${lead.status}`);
    return;
  }

  // Manual leads (email set, no companyUrl) bypass enrichment checks entirely
  const isManualLead = !!(lead as any).email && !(lead as any).companyUrl;

  if (!isManualLead) {
    // Wait for enrichment to complete before sending
    if (lead.enrichmentStatus === "NONE" || lead.enrichmentStatus === "PENDING") {
      throw new Error(`Lead ${leadId} not yet enriched — retrying`);
    }
    if (lead.enrichmentStatus === "FAILED" || !lead.companyId) {
      await prisma.campaignLead.update({ where: { id: campaignLeadId }, data: { completed: true } });
      console.log(`⏭️  Skipping lead ${leadId} — enrichment failed, no contacts found`);
      return;
    }
  }

  // Campaign still running?
  const campaign = await prisma.campaign.findUnique({ where: { id: campaignId } });
  if (!campaign || campaign.status !== "RUNNING") {
    console.log(`⏭️  Campaign ${campaignId} not running — skipping`);
    return;
  }

  // Get sequence step
  const sequence = await prisma.sequence.findUnique({ where: { id: sequenceId } });
  if (!sequence) throw new Error(`Sequence ${sequenceId} not found`);

  // Determine A/B variant for this lead
  const campaignLead = await prisma.campaignLead.findUnique({ where: { id: campaignLeadId } });
  const abVariant = campaignLead?.abVariant ?? "A";
  const useSubject = abVariant === "B" && sequence.subjectB ? sequence.subjectB : sequence.subject;
  const useBody = abVariant === "B" && sequence.bodyB ? sequence.bodyB : sequence.body;

  // Select inbox (rotation + daily cap)
  const inbox = await getAvailableInbox(workspaceId);
  if (!inbox) {
    console.log(`⚠️  No available inbox for workspace ${workspaceId} — daily limits hit, will retry tomorrow`);
    return;
  }

  // For manual leads use the lead fields directly; otherwise look up enriched contacts
  let dm1: DMContact | null = null;
  let dm2: DMContact | null = null;
  if (isManualLead) {
    dm1 = {
      firstName: (lead as any).firstName ?? null,
      lastName: (lead as any).lastName ?? null,
      email: (lead as any).email,
      jobTitle: (lead as any).title ?? null,
      linkedinUrl: null,
    };
    const ccRaw: string | undefined = ((lead as any).customData as any)?.cc;
    if (ccRaw) {
      const ccEmail = ccRaw.trim().split(/[,;]/)[0]?.trim();
      if (ccEmail) dm2 = { email: ccEmail, firstName: null, lastName: null, jobTitle: null, linkedinUrl: null };
    }
  } else {
    const result = await getDecisionMakers(workspaceId, (lead as any).companyId ?? null);
    dm1 = result.dm1;
    dm2 = result.dm2;
    if (!dm1) {
      await prisma.campaignLead.update({ where: { id: campaignLeadId }, data: { completed: true } });
      console.log(`⏭️  Skipping lead ${leadId} — no contacts found after enrichment`);
      return;
    }
  }

  const { subject, body } = await generatePersonalizedEmail(useSubject, useBody, lead, dm1, dm2);

  // Create email log
  const emailLog = await prisma.emailLog.create({
    data: {
      workspaceId,
      campaignId,
      leadId,
      sequenceId,
      inboxId: inbox.id,
      to: dm1.email,
      cc: dm2?.email ?? null,
      subject,
      body,
      abVariant,
      status: "PENDING",
    },
  });

  // Build URLs
  const unsubscribeUrl = `${API_URL}/api/emails/unsubscribe/${lead.unsubscribeToken}`;
  const trackingPixelUrl = `${API_URL}/api/emails/track/${emailLog.id}`;
  const htmlBody = buildHtmlEmail(body, unsubscribeUrl, trackingPixelUrl);

  // Send via SMTP
  try {
    const transporter = nodemailer.createTransport({
      host: inbox.smtpHost,
      port: inbox.smtpPort,
      secure: inbox.smtpPort === 465,
      auth: { user: inbox.smtpUser, pass: inbox.smtpPass },
    });

    const mailOptions: nodemailer.SendMailOptions = {
      from: `"${campaign.fromName || inbox.name}" <${inbox.email}>`,
      to: dm1.email,
      replyTo: campaign.replyTo || inbox.email,
      subject,
      html: htmlBody,
      text: body + `\n\n---\nUnsubscribe: ${unsubscribeUrl}`,
    };
    if (dm2?.email) mailOptions.cc = dm2.email;

    await transporter.sendMail(mailOptions);

    // Mark SENT
    await prisma.emailLog.update({
      where: { id: emailLog.id },
      data: { status: "SENT", sentAt: new Date() },
    });

    // Increment inbox counter
    await prisma.inbox.update({
      where: { id: inbox.id },
      data: { sentToday: { increment: 1 } },
    });

    // Advance campaign lead
    await prisma.campaignLead.update({
      where: { id: campaignLeadId },
      data: { currentStep: step, lastEmailAt: new Date() },
    });

    const ccInfo = dm2?.email ? ` cc: ${dm2.email}` : "";
    console.log(`✅ Email sent to ${dm1.email}${ccInfo} (step ${step + 1}, inbox: ${inbox.email})`);

    // Queue next step if available
    const nextSequence = await prisma.sequence.findFirst({
      where: { campaignId, step: step + 2 },
    });

    if (nextSequence) {
      const { emailQueue } = await import("../worker");
      await emailQueue.add(
        "send-email",
        { campaignLeadId, campaignId, leadId, sequenceId: nextSequence.id, workspaceId, step: step + 1 },
        { delay: nextSequence.delayDays * 24 * 60 * 60 * 1000 },
      );
    } else {
      await prisma.campaignLead.update({ where: { id: campaignLeadId }, data: { completed: true } });
      console.log(`🏁 Sequence complete for ${lead.email}`);
    }
  } catch (err: any) {
    const hard = isHardBounce(err);

    await prisma.emailLog.update({
      where: { id: emailLog.id },
      data: { status: hard ? "BOUNCED" : "FAILED", error: err.message },
    });

    if (hard) {
      // Permanent failure — stop sending to this lead entirely
      await prisma.lead.update({ where: { id: leadId }, data: { status: "BOUNCED" } });
      await prisma.campaignLead.update({ where: { id: campaignLeadId }, data: { completed: true } });
      console.log(`🚫 Hard bounce for ${dm1.email} — marked BOUNCED`);
    } else {
      console.error(`❌ Soft failure sending to ${dm1.email}:`, err.message);
      throw err; // BullMQ will retry
    }
  }
}
