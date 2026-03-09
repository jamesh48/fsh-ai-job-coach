# FSH AI Job Coach — Claude Context

## Instructions for Claude
Keep this file up to date. After any session where new libraries are added, architectural decisions are made, conventions are established, or features are built, update the relevant sections of this file. If a section becomes outdated, correct it. This file is the source of truth for project context across conversations.

After editing any `*.ts`, `*.tsx`, `*.js`, `*.jsx`, or `*.json` file, run:
```bash
yarn format && yarn lint
```
This auto-formats and lints the affected files so code is always clean before the user commits.

## Project Overview
An AI-powered job search coaching app. The core MVP is a daily activity log where users record what they did each day in their job search. An AI coach (Claude) analyzes the log and gives actionable daily recommendations. A gear icon in the header opens a Settings dialog for API key configuration. Printing is handled client-side via WebUSB (ESC/POS).

## Tech Stack
- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript (strict)
- **UI**: Material UI v7 + MUI Icons
- **State / Data fetching**: Redux Toolkit + RTK Query
- **Forms**: React Hook Form + Yup + @hookform/resolvers
- **Notifications**: notistack (SnackbarProvider)
- **Database**: PostgreSQL via Prisma 7 (driver adapter: @prisma/adapter-pg)
- **AI**: Anthropic SDK (`@anthropic-ai/sdk`) — model `claude-sonnet-4-6`
- **Markdown rendering**: react-markdown
- **Printing**: WebUSB API (browser-side ESC/POS — Chrome/Edge only, requires HTTPS)
- **Auth**: bcryptjs (password hashing) + jose (JWT session cookie)
- **Package manager**: Yarn
- **Linter / Formatter**: Biome (single quotes, semicolons as needed)
- **Node version**: 20 (pinned via `.nvmrc`)

## Architecture

### Folder Structure
```
app/                          # Next.js App Router — routes, layouts, API routes
  api/logs/route.ts           # GET all, POST new log
  api/logs/[id]/route.ts      # PUT update, DELETE log
  api/ai/recommendation/route.ts  # POST — calls Claude
  api/settings/route.ts       # GET/PUT settings singleton
  api/auth/login/route.ts     # POST — verify password, create session
  api/auth/logout/route.ts    # POST — destroy session
  api/auth/status/route.ts    # GET — { hasPassword: boolean }
  api/auth/password/route.ts  # PUT — change password
  api/healthcheck/route.ts    # GET — ALB health check
  layout.tsx                  # Root layout — wraps with <Providers>
  login/page.tsx              # Login / first-time setup page
  providers.tsx               # Client: Redux Provider + MUI ThemeProvider + SnackbarProvider
  HomeLayout.tsx              # Client: owns collapsed state, 75/25 vertical split
  page.tsx                    # Home page — renders <HomeLayout>
features/                     # Feature modules (co-located components, hooks, types)
  logs/
    components/
      LogCard.tsx             # Single day card with edit/delete buttons
      LogForm.tsx             # MUI Dialog + react-hook-form + yup for add/edit
      LogList.tsx             # Main view: header, card stack, snackbars, settings + logout triggers
    hooks/
      useLogs.ts              # Wraps RTK Query hooks (add, update, remove, sorted list)
    types.ts                  # DailyLog, LogFormValues types
    index.ts                  # Barrel export
  ai/
    components/
      AiRecommendation.tsx    # Collapsible purple panel; "Get Advice" button; WebUSB print; ReactMarkdown
    hooks/
      useWebUsbPrinter.ts     # WebUSB hook — connect, print ESC/POS, disconnect
    types.ts                  # AiRecommendationResponse
    index.ts
  auth/
    components/
      LoginForm.tsx           # Detects first-time setup vs login; handles both flows
  settings/
    components/
      SettingsDialog.tsx      # MUI Dialog: AI key field + change password section
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
  api.ts                      # RTK Query createApi — all endpoints incl. AI, settings
  store.ts                    # Redux configureStore (API slice only)
  prisma.ts                   # PrismaClient singleton (uses PrismaPg adapter)
  session.ts                  # createSession / destroySession (jose JWT cookie)
  utils.ts                    # cn() class merge utility
  generated/prisma/           # Prisma-generated client (gitignored)
middleware.ts                 # Protects all routes; redirects to /login if no valid session
types/
  index.ts                    # Global shared types (ApiResponse<T>)
prisma/
  schema.prisma               # DailyLog + Settings models
prisma.config.ts              # Prisma 7 config (datasource URL from env)
iac/                          # AWS CDK deployment stack
  bin/app.ts                  # CDK entry point
  lib/fsh-job-coach-stack.ts  # Fargate + ALB stack (lmkn.net, priority 40)
.github/workflows/
  cdk-deploy.yaml             # CI/CD: deploy on push to main
.nvmrc                        # Pins Node 20
Dockerfile                    # Node 20 slim, yarn install, prisma generate, next build
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
  id              String   @id @default("singleton")
  anthropicApiKey String?
  passwordHash    String?
  updatedAt       DateTime @updatedAt
}
```

### Key Constraints
- Only one log entry per date (`@unique` on `date`). Enforced at DB, API (P2002 → 409), and form (yup).
- Settings is a singleton row (id = "singleton"), always upserted.

## Key Conventions
- All components that use hooks or browser APIs are `'use client'`
- API routes live under `app/api/` and use Next.js 16 async params: `{ params }: { params: Promise<{ id: string }> }`
- RTK Query mutations return results — always check `'error' in result` before showing success
- Snackbars via `useSnackbar()` from notistack for all user-facing feedback
- Form validation via Yup schemas passed through `yupResolver`
- Biome enforces single quotes and semicolons only as needed

## AI Feature
- `app/api/ai/recommendation/route.ts` — reads API key from DB settings, calls Claude, returns recommendation
- Sends full log history to Claude with today's date; prompts for 2-4 sentence actionable advice for today
- `AiRecommendation.tsx` — collapsible panel (40vh expanded / 49px collapsed); uses `getAiRecommendation` RTK mutation; renders response through react-markdown
- Print button (USB icon → print icon) sends ESC/POS bytes via WebUSB when a printer is connected

## Printing (WebUSB)
- `features/ai/hooks/useWebUsbPrinter.ts` — manages WebUSB device lifecycle and ESC/POS byte building
- Chrome/Edge only; requires HTTPS (works on lmkn.net)
- Click USB icon in AI panel header to pair printer; icon becomes print icon once connected
- ESC/POS receipt layout: init → feed → separator → bold "JOB SEARCH COACH" → MM-DD-YYYY date → separator → plain text recommendation → separator → feed → partial cut
- Automatically finds bulk OUT endpoint across all interfaces

## Auth (Password Gate)
- Single-user password protection via bcrypt hash stored in Settings DB
- Session: 30-day httpOnly JWT cookie signed with `SESSION_SECRET` env var
- `middleware.ts` protects all routes except `/login` and `/api/auth/*`
- First visit with no password set: `/login` shows "Create Password" form
- Subsequent visits: password prompt
- Logout icon button in LogList header
- Change password in Settings dialog (Security section)

## Deployment
- **URL**: `lmkn.net` (ALB listener priority 40)
- **Container startup**: `npx prisma migrate deploy && npx next start -p 3000`
- Migrations run automatically on every deploy as part of container startup
- `DATABASE_URL` constructed in CDK from `POSTGRES_PASSWORD` + CloudFormation-exported Postgres IP
- **GitHub Secrets**: `AWS_ACCESS_KEY`, `AWS_SECRET_KEY`, `POSTGRES_PASSWORD`, `SESSION_SECRET`
- **GitHub Variables**: `AWS_ACCOUNT_NUMBER`, `AWS_CLUSTER_ARN`, `AWS_DEFAULT_SG`, `AWS_VPC_ID`, `ALB_LISTENER_ARN`

## Setup Commands
```bash
# Use correct Node version
nvm use 20

# Install deps
yarn

# Generate Prisma client (after schema changes)
npx prisma generate

# Run DB migration (requires interactive terminal)
npx prisma migrate dev --name <migration-name>

# Dev server
yarn dev

# Type check
npx tsc --noEmit

# Lint / format
yarn lint
yarn format
```

## Environment
```
DATABASE_URL=postgresql://user:password@localhost:5432/fsh_job_coach
SESSION_SECRET=<random-string-at-least-32-chars>
```
Set in `.env` — `.env*` is gitignored.
The Anthropic API key is stored in the `Settings` DB table (plain text) and configured via the Settings dialog. There is no env var fallback.

## What's Next (Planned)
- Resume, Interview, and Jobs features (placeholder folders exist)
