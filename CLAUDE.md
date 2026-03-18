# FSH AI Job Coach — Claude Context

## Instructions for Claude
Keep this file up to date. After any session where new libraries are added, architectural decisions are made, conventions are established, or features are built, update the relevant sections of this file. If a section becomes outdated, correct it. This file is the source of truth for project context across conversations.

After editing any `*.ts`, `*.tsx`, `*.js`, `*.jsx`, or `*.json` file, run:
```bash
yarn format && yarn lint && yarn tsc --noEmit
```
This auto-formats, lints, and type-checks so errors are caught locally before the user commits.

Always use `yarn` instead of `npx` for running scripts and tools (e.g. `yarn prisma migrate dev` not `npx prisma migrate dev`).

## Project Overview
An AI-powered job search coaching app. The core MVP is a daily activity log where users record what they did each day in their job search. An AI coach (Claude) analyzes the log and gives actionable daily recommendations. Job applications are tracked with full detail (status, compensation, activities, AI-generated documents). A gear icon in the header opens a Settings dialog for API key configuration, career profile, resume, profile links, appearance, and printing. Printing is handled client-side via WebUSB (ESC/POS). A desktop agent (Electron) connects via WebSocket and forwards real-time email and calendar events, which are AI-filtered and surfaced as in-app notifications.

## Tech Stack
- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript (strict)
- **UI**: Material UI v7 + MUI Icons + Phosphor Icons (`@phosphor-icons/react`) for AI-specific icons (`Sparkle` weight="fill" for branding, `MagicWand` weight="fill" for actions)
- **State / Data fetching**: Redux Toolkit + RTK Query
- **Forms**: React Hook Form + Yup + @hookform/resolvers
- **Notifications**: notistack (SnackbarProvider)
- **Database**: PostgreSQL via Prisma 7 (driver adapter: @prisma/adapter-pg)
- **AI**: Anthropic SDK (`@anthropic-ai/sdk`) — model `claude-sonnet-4-6`
- **Markdown rendering**: react-markdown
- **Printing**: WebUSB API (browser-side ESC/POS — Chrome/Edge only, requires HTTPS)
- **Auth**: bcryptjs (password hashing) + jose (JWT session cookie)
- **WebSocket server**: `ws` npm package — custom Node.js server (`server.js`) wrapping Next.js
- **Package manager**: Yarn
- **Linter / Formatter**: Biome (single quotes, semicolons as needed)
- **Node version**: 24

## Architecture

### Folder Structure
```
app/                          # Next.js App Router — routes, layouts, API routes
  api/logs/route.ts           # GET all, POST new log
  api/logs/[id]/route.ts      # PUT update, DELETE log
  api/ai/recommendation/route.ts  # GET stored recommendation, POST — calls Claude
  api/ai/summarize/route.ts   # POST — summarize job description with Claude
  api/ai/impression/route.ts  # POST — draft impression with Claude
  api/ai/assist/route.ts      # POST — AI writing assistant (cover letters, emails, etc.)
  api/ai/fill-from-url/route.ts  # POST — scrape job URL and extract structured fields via Claude
  api/agent/email/route.ts    # POST — classify + store email (internal, called by server.js)
  api/agent/calendar/route.ts # POST — classify calendar event (internal, called by server.js)
  api/agent/emails/route.ts         # GET — list stored emails (auto-expires >90 days); DELETE — clear all
  api/agent/emails/[id]/route.ts    # DELETE — dismiss single email
  api/agent/calendar-events/route.ts     # GET — list stored calendar events (auto-expires >90 days); DELETE — clear all
  api/agent/calendar-events/[id]/route.ts  # DELETE — dismiss single calendar event
  api/settings/route.ts       # GET/PUT settings singleton
  api/auth/login/route.ts     # POST — verify password, create session
  api/auth/logout/route.ts    # POST — destroy session
  api/auth/status/route.ts    # GET — { hasPassword: boolean }
  api/auth/password/route.ts  # PUT — change password
  api/healthcheck/route.ts    # GET — ALB health check
  layout.tsx                  # Root layout — reads themeMode cookie, wraps with <Providers>
  login/page.tsx              # Login / first-time setup page
  providers.tsx               # Client: Redux + MUI ThemeProvider + Snackbar + AgentSocketProvider; createAppTheme(mode)
  HomeLayout.tsx              # Client: owns collapsed state, 50/50 vertical split
  page.tsx                    # Home page — renders <HomeLayout>
features/                     # Feature modules (co-located components, hooks, types)
  logs/
    applicationFormUtils.ts   # Shared: JobApplicationEntry type, STATUS/PRIORITY/FIT labels, serialize/parse
    components/
      LogCard.tsx             # Single day card; collapsible app list; add/edit/delete app; document viewer + delete; fit score chip
      LogForm.tsx             # MUI Dialog + react-hook-form + yup for add/edit full log entry
      AddApplicationDialog.tsx  # Standalone dialog for adding/editing a single job application; fill-from-url + fit score
      LogList.tsx             # Main view: header with agent status dot, notification bell, search, card stack
    hooks/
      useLogs.ts              # Wraps RTK Query hooks (add, update, remove, sorted list)
    types.ts                  # DailyLog, LogFormValues types
    index.ts                  # Barrel export
  ai/
    components/
      AiRecommendation.tsx    # Collapsible panel (75vh / 49px); "Get Advice"; auto-print; ReactMarkdown
      AiAssistDialog.tsx      # AI writing assistant dialog; markdown preview; PDF download; save to application
      AgentDialog.tsx         # Dialog showing desktop agent connection status + live event feed
    hooks/
      useWebUsbPrinter.ts     # WebUSB hook — connect, markdown-aware ESC/POS print, disconnect
    types.ts                  # AiRecommendationResponse, StoredRecommendationResponse, AgentEmail, AgentEmailClassification
    index.ts
  agent/
    components/
      NotificationBell.tsx    # Bell icon with unread badge; popover list + detail dialog; dismiss/clear all
  auth/
    components/
      LoginForm.tsx           # Detects first-time setup vs login; handles both flows
  settings/
    components/
      SettingsDialog.tsx      # MUI Dialog: Appearance, Printing, AI key, Career Profile, Resume, Links, Security
    types.ts                  # AppSettings, SettingsFormValues, PasswordFormValues
    index.ts
  resume/                     # Placeholder feature
  interview/                  # Placeholder feature
  jobs/                       # Placeholder feature
components/
  ui/                         # Primitive shared UI (empty, ready to fill)
hooks/
  redux.ts                    # Typed useAppDispatch / useAppSelector
lib/
  api.ts                      # RTK Query createApi — all endpoints incl. AI, settings, agent emails
  store.ts                    # Redux configureStore (API slice only)
  prisma.ts                   # PrismaClient singleton (uses PrismaPg adapter)
  session.ts                  # createSession / destroySession (jose JWT cookie)
  themeModeContext.tsx        # ThemeModeProvider + useThemeMode; preference in cookie + localStorage
  useAutoPrint.ts             # useAutoPrint hook; auto-print preference in localStorage
  agentSocketContext.tsx      # AgentSocketProvider + useAgentSocket(); manages /ws/client WebSocket with exponential backoff reconnect
  agentNotificationHandler.tsx  # Renderless component; fires browser Notification for relevant email_detected events
  utils.ts                    # cn() class merge utility
  generated/prisma/           # Prisma-generated client (gitignored)
middleware.ts                 # Protects all routes; /api/agent/email and /api/agent/calendar are public (use x-agent-secret instead)
server.js                     # Custom Node.js HTTP server wrapping Next.js; hosts /ws/agent and /ws/client WebSocket endpoints
types/
  index.ts                    # Global shared types (ApiResponse<T>)
prisma/
  schema.prisma               # DailyLog, Settings, AgentEmail models
prisma.config.ts              # Prisma 7 config (datasource URL from env)
iac/                          # AWS CDK deployment stack
  bin/app.ts                  # CDK entry point
  lib/fsh-job-coach-stack.ts  # Fargate + ALB stack (fshjobcoach.com, priority 40)
.github/workflows/
  cdk-deploy.yaml             # CI/CD: deploy on push to main
Dockerfile                    # Node 24 slim, yarn install, prisma generate, next build; CMD: node server.js
```

### Path Alias
`@/*` maps to the project root. Use `@/features/logs`, `@/lib/api`, etc.

## Database

### Prisma Setup (v7)
Prisma 7 requires a driver adapter — connection string is NOT passed via schema, it's done at runtime in `lib/prisma.ts`:
```ts
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! })
new PrismaClient({ adapter })
```
Generated client lives at `lib/generated/prisma/client` (not the default node_modules location).

### Models
```prisma
model DailyLog {
  id        String   @id @default(cuid())
  date      String   @unique   // one entry per day enforced at DB + app level
  content   String
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

model Settings {
  id                   String    @id @default("singleton")
  anthropicApiKey      String?
  passwordHash         String?
  lastRecommendation   String?
  lastRecommendationAt DateTime?  // full timestamp, not just date
  careerProfile        String?
  resume               String?
  profileLinks         String?   // JSON array of { label, url } — parsed in API routes
  jobSearchPlan        String?
  updatedAt            DateTime  @updatedAt
}

model AgentEmail {
  id             String   @id @default(cuid())
  emailId        String   @unique  // Gmail message ID — prevents duplicates
  threadId       String
  subject        String
  sender         String
  snippet        String
  date           String
  classification Json     // { type, reason } from Claude Haiku classification
  receivedAt     DateTime @default(now())
}

model AgentCalendarEvent {
  id             String   @id @default(cuid())
  eventId        String   @unique  // Google Calendar event ID — prevents duplicates
  summary        String
  description    String?
  start          String?
  end            String?
  organizer      String?
  classification Json     // { type, reason } from Claude Haiku classification
  receivedAt     DateTime @default(now())
}
```

### Key Constraints
- Only one log entry per date (`@unique` on `date`). Enforced at DB, API (P2002 → 409), and form (yup).
- Settings is a singleton row (id = "singleton"), always upserted.
- `AgentEmail.emailId` is `@unique` — upsert with `update: {}` prevents duplicate storage if the agent re-sends.

## Key Conventions
- All components that use hooks or browser APIs are `'use client'`
- API routes live under `app/api/` and use Next.js 16 async params: `{ params }: { params: Promise<{ id: string }> }`
- RTK Query mutations return results — always check `'error' in result` before showing success
- Snackbars via `useSnackbar()` from notistack for all user-facing feedback
- Form validation via Yup schemas passed through `yupResolver`
- Always add `noValidate` to `<form>` elements that use RHF — MUI TextField's `required` prop silently adds the HTML `required` attribute, which causes the browser to intercept submit before RHF/Yup can run
- Biome enforces single quotes and semicolons only as needed
- Do NOT add `* { box-sizing: border-box }` to globals.css — MUI CssBaseline owns box-sizing via the `inherit` pattern and a duplicate rule breaks width calculations

## Theme
- Defined in `app/providers.tsx` via `createAppTheme(mode: 'light' | 'dark')`
- **Primary**: Indigo — `#4F46E5` (light) / `#818CF8` (dark)
- **Secondary**: Violet — `#9333EA` (light) / `#C084FC` (dark) — used for AI panel accents
- **Backgrounds**: `#F8FAFC` / `#FFFFFF` (light), `#0F172A` / `#1E293B` (dark)
- Dark/light/system preference stored in `themeMode` cookie (read server-side in `layout.tsx` to avoid flash) and mirrored to localStorage
- `ThemeModeProvider` in `lib/themeModeContext.tsx` exposes `useThemeMode()` hook
- Toggle in Settings dialog → Appearance section

## Job Application Fields
Defined in `features/logs/applicationFormUtils.ts`:
- `jobTitle`, `company`, `applicationUrl`, `source`
- `recruiter`, `recruiterLinkedin`, `recruiterPhone`, `recruiterEmail`
- `workArrangement` (Remote / Hybrid / On-site), `compensation` (free text, e.g. "$120k-$150k/yr")
- `roleDescription`, `impression`
- `priority`: `quick_apply` | `standard` | `strong_interest` | `hot_lead`
- `status`: `applied` | `recruiter_screen` | `interviewing` | `offer` | `rejected`
- `activities`: `Activity[]` — managed via the activities drawer in `LogCard`
- `documents`: `AppDocument[]` — AI-generated docs saved to the app; each has `id`, `label`, `content` (markdown), `createdAt`

Content is serialized as structured plain text in `DailyLog.content` via `serializeToContent` / `parseContent`. Documents are JSON-encoded inline to safely handle multi-line content within the line-based format.

## AI Feature
- `app/api/ai/recommendation/route.ts` — smart windowing: last 30 days + older hot/strong-interest entries; injects career profile, resume, profile links, job search plan, and recent agent emails as system context; stores result + timestamp in Settings
- `app/api/ai/summarize/route.ts` — summarizes pasted job description to 4-6 sentences
- `app/api/ai/impression/route.ts` — drafts a 2-3 sentence first-person impression
- `app/api/ai/assist/route.ts` — AI writing assistant; parallel calls: main response (sonnet-4-6) + filename suggestion (haiku); injects career profile, resume, and profile links; system prompt enforces no `---`, no standalone recipient line, correct closing format
- `app/api/ai/fill-from-url/route.ts` — fetches job URL, extracts `jobTitle`, `company`, `roleDescription`, `workArrangement`, `compensation` via Claude; LinkedIn-aware HTML parser; optionally generates `fitScore` (1–4) + `fitRationale` when career profile or resume are set
- `AiRecommendation.tsx` — collapsible panel (75vh expanded / 49px collapsed); auto-prints if USB printer connected and auto-print setting enabled
- `AiAssistDialog.tsx` — prompt input + markdown response preview; PDF download (jsPDF manual renderer); save output as named document to job application via `onSaveDocument` callback
- Recommendation timestamp stored as `DateTime` (`lastRecommendationAt`), displayed as `MM-DD-YYYY hh:mm:ss`

## Desktop Agent Integration
- `server.js` — custom Node.js HTTP server wrapping Next.js (`app.prepare().then(...)`). Runs as the dev and production entry point (`yarn dev` / `node server.js`).
- Uses `@next/env` `loadEnvConfig()` at startup to load `.env` before Next.js initializes.
- Two WebSocket servers (both `noServer: true`, routed via `server.on('upgrade')`):
  - `/ws/agent` — for the Electron desktop agent; requires `?secret=AGENT_SECRET` query param; one connection at a time (new connection displaces existing)
  - `/ws/client` — for browser clients; no auth (session cookie covers the page load)
- Ping/pong keepalive every 30s on both sides; terminates on missed pong.
- **Email filtering**: `email_detected` events are intercepted, classified via `POST /api/agent/email` (Haiku, forced tool_use). Relevant emails are stored in `AgentEmail` and forwarded with classification attached. Irrelevant emails are dropped silently. Failures fail open.
- **Calendar filtering**: `calendar_event` events are intercepted, classified via `POST /api/agent/calendar` (Haiku, forced tool_use). Relevant events are stored in `AgentCalendarEvent` and forwarded with classification attached. Irrelevant events are dropped silently. Failures fail open.
- **Internal API routes** (`/api/agent/email`, `/api/agent/calendar`, `/api/agent/validate-secret`) are exempt from session middleware.
- **Agent WebSocket auth**: on upgrade, `server.js` async-calls `POST /api/agent/validate-secret` with the `?secret=` query param before completing the WebSocket handshake. The route checks `settings.agentSecret` — if not set or mismatched, the upgrade is rejected. Configurable in Settings → Security. No env var fallback.
- **Test bypass**: subject or snippet containing `fsh-test` skips Claude classification and forces `relevant: true` (useful for end-to-end testing).
- `lib/agentSocketContext.tsx` — React context managing `/ws/client` WebSocket with exponential backoff reconnect (2s → 30s cap). Exposes `{ status, lastEvent, events, send }` via `useAgentSocket()`. Tracks last 50 events.
- `lib/agentNotificationHandler.tsx` — renderless `'use client'` component mounted in `Providers`; fires `new Notification(...)` for relevant `email_detected` events; dedupes via ref Set.
- `features/agent/components/NotificationBell.tsx` — bell icon with unread badge in the header; tabbed popover (Emails / Calendar) lists stored items from DB; detail dialogs (Gmail deep-link for emails, start/end/organizer for calendar); dismiss individual or clear all per tab; auto-expires items >90 days old on each fetch.

## Job Application Fit Score
- Generated by `fill-from-url` when `careerProfile` or `resume` are set in Settings
- `fitScore`: `1` (Strong) | `2` (Good) | `3` (Partial) | `4` (Weak)
- `fitRationale`: one-sentence explanation
- Displayed as a color-coded chip in `AddApplicationDialog` and `LogCard`
- Stored serialized in `DailyLog.content` via `serializeToContent` / `parseContent`

## Printing (WebUSB)
- `features/ai/hooks/useWebUsbPrinter.ts` — manages WebUSB device lifecycle and markdown-aware ESC/POS rendering
- Chrome/Edge only; requires HTTPS (works on fshjobcoach.com)
- ESC/POS renderer handles: `**bold**` inline, `# H1` (centered bold), `## H2` (left bold), `- bullets`, `1. numbered lists`
- Auto-print setting: `lib/useAutoPrint.ts` (localStorage key `autoPrint`); toggle in Settings → Printing

## Auth (Password Gate)
- Single-user password protection via bcrypt hash stored in Settings DB
- Session: 30-day httpOnly JWT cookie signed with `SESSION_SECRET` env var
- `middleware.ts` protects all routes except `/login`, `/api/auth/*`, `/api/agent/email`, and `/api/agent/calendar`
- First visit with no password set: `/login` shows "Create Password" form
- Subsequent visits: password prompt
- Logout icon button in LogList header
- Change password in Settings dialog (Security section)

## Deployment
- **URL**: `fshjobcoach.com` (ALB listener priority 40)
- **Container startup**: `yarn prisma migrate deploy && node server.js`
- Migrations run automatically on every deploy as part of container startup
- `DATABASE_URL` constructed in CDK from `POSTGRES_PASSWORD` + CloudFormation-exported Postgres IP
- **GitHub Secrets**: `AWS_ACCESS_KEY`, `AWS_SECRET_KEY`, `POSTGRES_PASSWORD`, `SESSION_SECRET`
- **GitHub Variables**: `AWS_ACCOUNT_NUMBER`, `AWS_CLUSTER_ARN`, `AWS_DEFAULT_SG`, `AWS_VPC_ID`, `ALB_LISTENER_ARN`

## Setup Commands
```bash
# Use correct Node version
nvm use 24

# Install deps
yarn

# Generate Prisma client (after schema changes)
yarn prisma generate

# Run DB migration (requires interactive terminal)
yarn prisma migrate dev --name <migration-name>

# Dev server (runs server.js, not next dev directly)
yarn dev

# Type check
yarn tsc --noEmit

# Lint / format
yarn lint
yarn format
```

## Environment
```
DATABASE_URL=postgresql://user:password@localhost:5432/fsh_job_coach
SESSION_SECRET=<random-string-at-least-32-chars>
PORT=3000                           # optional, defaults to 3000
```
Set in `.env` — `.env*` is gitignored.
The Anthropic API key and agent secret are stored in the `Settings` DB table and configured via the Settings dialog. There are no env var fallbacks for either.

## What's Next (Planned)
- Resume, Interview, and Jobs features (placeholder folders exist)
- Store and surface calendar events (currently classified + forwarded but not persisted)
