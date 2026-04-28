import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export interface EnrichJobData {
  domain: string;
  workspaceId: string;
  leadIds: string[];
}

// ─── Provider types ─────────────────────────────────────────────────────────

interface EnrichedContact {
  firstName?: string;
  lastName?: string;
  email: string;
  jobTitle?: string;
  linkedinUrl?: string;
  confidenceScore?: number;
}

interface EnrichmentResult {
  companyName?: string;
  industry?: string;
  size?: string;
  location?: string;
  description?: string;
  contacts: EnrichedContact[];
}

// ─── Title scoring ──────────────────────────────────────────────────────────

const TITLE_TIERS: [string[], number][] = [
  [["ceo", "chief executive", "founder", "co-founder", "cofounder", "owner"], 10],
  [["cto", "chief technology", "coo", "chief operating", "president"], 8],
  [["cmo", "chief marketing", "cso", "chief sales", "vp ", "vice president"], 7],
  [["director", "head of"], 5],
  [["manager", "lead "], 3],
];

function scoreTitle(title: string): number {
  const t = title.toLowerCase();
  for (const [keywords, score] of TITLE_TIERS) {
    if (keywords.some((k) => t.includes(k))) return score;
  }
  return 1;
}

// ─── Credential loader ──────────────────────────────────────────────────────

async function loadProviderCredentials(workspaceId: string): Promise<Map<string, Record<string, string>>> {
  try {
    const providers = await prisma.enrichmentProvider.findMany({
      where: { workspaceId, enabled: true },
    });
    const map = new Map<string, Record<string, string>>();
    for (const p of providers) {
      map.set(p.name, p.credentials as Record<string, string>);
    }
    return map;
  } catch {
    return new Map();
  }
}

function getCred(map: Map<string, Record<string, string>>, provider: string, field: string, envFallback = ""): string {
  return map.get(provider)?.[field] || envFallback;
}

// ─── Apollo provider ────────────────────────────────────────────────────────

async function apolloFindContacts(domain: string, apiKey: string): Promise<EnrichmentResult | null> {
  try {
    const res = await fetch("https://api.apollo.io/v1/mixed_people/search", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-cache",
        "X-Api-Key": apiKey,
      },
      body: JSON.stringify({
        api_key: apiKey,
        q_organization_domains: domain,
        page: 1,
        per_page: 10,
        person_titles: [
          "CEO", "Founder", "Co-Founder", "CTO", "COO", "CMO",
          "VP", "Vice President", "Director", "Head of",
        ],
      }),
    });

    if (!res.ok) return null;

    const data: any = await res.json();
    const people: any[] = data.people || [];
    const org = data.organizations?.[0] || people[0]?.organization || {};

    const contacts: EnrichedContact[] = people
      .filter((p: any) => p.email)
      .map((p: any) => ({
        firstName: p.first_name || undefined,
        lastName: p.last_name || undefined,
        email: p.email,
        jobTitle: p.title || undefined,
        linkedinUrl: p.linkedin_url || undefined,
        confidenceScore: p.email_status === "verified" ? 0.95 : 0.7,
      }));

    return {
      companyName: org.name,
      industry: org.industry,
      size: org.estimated_num_employees ? String(org.estimated_num_employees) : undefined,
      location: [org.city, org.country].filter(Boolean).join(", ") || undefined,
      description: org.short_description || undefined,
      contacts,
    };
  } catch {
    return null;
  }
}

// ─── Snov provider ──────────────────────────────────────────────────────────

let snovToken: string | null = null;
let snovTokenExpiry = 0;

async function getSnovToken(clientId: string, clientSecret: string): Promise<string | null> {
  if (snovToken && Date.now() < snovTokenExpiry) return snovToken;
  try {
    const res = await fetch("https://api.snov.io/v1/oauth/access_token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "client_credentials",
        client_id: clientId,
        client_secret: clientSecret,
      }),
    });
    const data: any = await res.json();
    snovToken = data.access_token || null;
    snovTokenExpiry = Date.now() + ((data.expires_in ?? 3600) - 60) * 1000;
    return snovToken;
  } catch {
    return null;
  }
}

async function snovFindContacts(domain: string, clientId: string, clientSecret: string): Promise<EnrichmentResult | null> {
  const token = await getSnovToken(clientId, clientSecret);
  if (!token) return null;

  try {
    const res = await fetch(
      `https://api.snov.io/v2/get-domain-emails?domain=${encodeURIComponent(domain)}&type=all&limit=10`,
      { headers: { Authorization: `Bearer ${token}` } },
    );
    if (!res.ok) return null;
    const data: any = await res.json();
    const emails: any[] = data.emails || [];

    const contacts: EnrichedContact[] = emails
      .filter((e: any) => e.email && e.emailStatus !== "invalid")
      .map((e: any) => ({
        firstName: e.firstName || undefined,
        lastName: e.lastName || undefined,
        email: e.email,
        jobTitle: e.position || undefined,
        linkedinUrl: e.linkedinLink || undefined,
        confidenceScore: e.emailStatus === "valid" ? 0.9 : 0.6,
      }));

    return {
      companyName: data.domainInfo?.name,
      industry: data.domainInfo?.industry,
      contacts,
    };
  } catch {
    return null;
  }
}

// ─── Hunter.io provider ─────────────────────────────────────────────────────

async function hunterFindContacts(domain: string, apiKey: string): Promise<EnrichmentResult | null> {
  try {
    const res = await fetch(
      `https://api.hunter.io/v2/domain-search?domain=${encodeURIComponent(domain)}&api_key=${encodeURIComponent(apiKey)}&limit=10`,
    );
    if (!res.ok) return null;
    const data: any = await res.json();
    const emails: any[] = data.data?.emails || [];
    const org = data.data || {};

    const contacts: EnrichedContact[] = emails
      .filter((e: any) => e.value)
      .map((e: any) => ({
        firstName: e.first_name || undefined,
        lastName: e.last_name || undefined,
        email: e.value,
        jobTitle: e.position || undefined,
        linkedinUrl: e.linkedin || undefined,
        confidenceScore: (e.confidence || 0) / 100,
      }));

    return {
      companyName: org.organization,
      contacts,
    };
  } catch {
    return null;
  }
}

// ─── Main enrichment job processor ─────────────────────────────────────────

export async function processEnrichJob(data: EnrichJobData): Promise<void> {
  const { domain, workspaceId, leadIds } = data;

  // Load credentials from DB first, fall back to env vars for backwards compatibility
  const credMap = await loadProviderCredentials(workspaceId);
  const apolloKey = getCred(credMap, "apollo", "apiKey", process.env.APOLLO_API_KEY || "");
  const snovClientId = getCred(credMap, "snov", "clientId", process.env.SNOV_CLIENT_ID || "");
  const snovClientSecret = getCred(credMap, "snov", "clientSecret", process.env.SNOV_CLIENT_SECRET || "");
  const hunterApiKey = getCred(credMap, "hunter", "apiKey");

  let result: EnrichmentResult | null = null;

  if (apolloKey) {
    result = await apolloFindContacts(domain, apolloKey);
    if (result?.contacts.length) {
      console.log(`✅ Apollo enriched ${domain}: ${result.contacts.length} contacts`);
    } else {
      result = null;
    }
  }

  if (!result && snovClientId && snovClientSecret) {
    result = await snovFindContacts(domain, snovClientId, snovClientSecret);
    if (result?.contacts.length) {
      console.log(`✅ Snov enriched ${domain}: ${result.contacts.length} contacts`);
    } else {
      result = null;
    }
  }

  if (!result && hunterApiKey) {
    result = await hunterFindContacts(domain, hunterApiKey);
    if (result?.contacts.length) {
      console.log(`✅ Hunter enriched ${domain}: ${result.contacts.length} contacts`);
    } else {
      result = null;
    }
  }

  if (!result || !result.contacts.length) {
    console.log(`⚠️  No contacts found for domain ${domain}`);
    if (leadIds.length) {
      await prisma.lead.updateMany({
        where: { id: { in: leadIds }, workspaceId },
        data: { enrichmentStatus: "FAILED" },
      });
    }
    return;
  }

  // Score contacts and keep top 2 decision-makers
  const scored = result.contacts
    .map((c) => ({ ...c, score: scoreTitle(c.jobTitle || "") }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 2);

  // Upsert Company record
  const company = await prisma.company.upsert({
    where: { workspaceId_domain: { workspaceId, domain } },
    create: {
      workspaceId,
      domain,
      name: result.companyName,
      industry: result.industry,
      size: result.size,
      location: result.location,
      description: result.description,
      enrichedAt: new Date(),
    },
    update: {
      ...(result.companyName && { name: result.companyName }),
      ...(result.industry && { industry: result.industry }),
      ...(result.size && { size: result.size }),
      ...(result.location && { location: result.location }),
      ...(result.description && { description: result.description }),
      enrichedAt: new Date(),
    },
  });

  for (const contact of scored) {
    await prisma.contact.upsert({
      where: { workspaceId_email: { workspaceId, email: contact.email } },
      create: {
        workspaceId,
        companyId: company.id,
        firstName: contact.firstName,
        lastName: contact.lastName,
        email: contact.email,
        jobTitle: contact.jobTitle,
        linkedinUrl: contact.linkedinUrl,
        confidenceScore: contact.confidenceScore,
        score: contact.score,
        source: "enrichment",
        status: "ACTIVE",
      },
      update: {
        ...(contact.jobTitle && { jobTitle: contact.jobTitle }),
        ...(contact.linkedinUrl && { linkedinUrl: contact.linkedinUrl }),
        ...(contact.confidenceScore && { confidenceScore: contact.confidenceScore }),
        score: contact.score,
      },
    });
  }

  if (leadIds.length) {
    const dm1 = scored[0];
    await prisma.lead.updateMany({
      where: { id: { in: leadIds }, workspaceId },
      data: {
        enrichmentStatus: "ENRICHED",
        companyId: company.id,
        email: dm1.email,
        firstName: dm1.firstName ?? null,
        lastName: dm1.lastName ?? null,
        company: result.companyName ?? null,
        title: dm1.jobTitle ?? null,
      },
    });
  }

  console.log(`🏢 ${domain} → company upserted, ${scored.length} contacts saved`);
}
