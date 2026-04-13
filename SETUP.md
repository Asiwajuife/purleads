# Purleads — Setup Guide

## Prerequisites

- Node.js 20+
- Docker Desktop
- Git

---

## 1. Clone & Install

```bash
cd purleads
npm install
```

---

## 2. Environment Variables

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

Fill in:
- `OPENAI_API_KEY` — your OpenAI key
- All other values are pre-filled for local development

---

## 3. Start Infrastructure (Docker)

```bash
docker-compose up -d
```

This starts:
- **PostgreSQL** on port 5432
- **Redis** on port 6379

---

## 4. Run Database Migration

```bash
npm run prisma:generate
npm run prisma:migrate
```

Or run directly:
```bash
npx prisma migrate dev --schema=./prisma/schema.prisma --name init
```

---

## 5. Start All Services

Open **3 terminals**:

**Terminal 1 — API (NestJS)**
```bash
cd apps/api
npm install
npm run dev
# Runs on http://localhost:3001
```

**Terminal 2 — Worker (BullMQ)**
```bash
cd apps/worker
npm install
npm run dev
# Processes email jobs from queue
```

**Terminal 3 — Web (Next.js)**
```bash
cd apps/web
npm install
npm run dev
# Runs on http://localhost:3000
```

---

## 6. Access the App

Open http://localhost:3000

1. Click **Create Account**
2. Register — a default workspace is auto-created
3. Go to **Settings** → add an inbox (SMTP credentials)
4. Go to **Leads** → upload a CSV file
5. Go to **Campaigns** → create a campaign, add sequence steps, add leads, launch

---

## API Endpoints

All API routes are prefixed with `/api/`:

| Method | Path | Description |
|--------|------|-------------|
| POST | /api/auth/register | Register user |
| POST | /api/auth/login | Login |
| GET | /api/auth/me | Current user |
| GET | /api/workspaces | List workspaces |
| POST | /api/workspaces | Create workspace |
| GET | /api/leads | List leads |
| POST | /api/leads/upload-csv | Upload CSV |
| GET | /api/campaigns | List campaigns |
| POST | /api/campaigns | Create campaign |
| POST | /api/campaigns/:id/launch | Launch campaign |
| POST | /api/campaigns/:id/sequences | Add sequence step |
| GET | /api/inboxes | List inboxes |
| POST | /api/inboxes | Add inbox |
| GET | /api/emails/stats | Workspace stats |
| GET | /api/replies | List replies |

All protected routes require:
- `Authorization: Bearer <token>` header
- `x-workspace-id: <workspaceId>` header

---

## CSV Format

Upload leads via CSV with these columns (headers case-insensitive):

```
email,firstName,lastName,company,title,website,phone
john@acme.com,John,Smith,Acme Corp,CEO,acme.com,+1555000000
```

---

## Email Personalization

Use template variables in your sequence steps:
- `{{name}}` — lead's full name
- `{{company}}` — lead's company

The AI (OpenAI GPT-4o-mini) will further personalize each email automatically.

---

## Production Deployment

1. Set env vars on your server (use a `.env` file or secret manager)
2. Use a production PostgreSQL instance (e.g. Neon, Supabase, RDS)
3. Use a production Redis instance (e.g. Upstash)
4. Build API: `npm run build:api && npm start` in `apps/api`
5. Build web: `npm run build:web && npm start` in `apps/web`
6. Run worker: `npm start` in `apps/worker`
7. Use PM2 or Docker for process management
