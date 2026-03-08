# FSH AI Job Coach — Claude Context

## Instructions for Claude
Keep this file up to date. After any session where new libraries are added, architectural decisions are made, conventions are established, or features are built, update the relevant sections of this file. If a section becomes outdated, correct it. This file is the source of truth for project context across conversations.

## Project Overview
An AI-powered job search coaching app. The core MVP is a daily activity log where users record what they did each day in their job search. An AI coach (Claude) analyzes the log and gives actionable daily recommendations. A gear icon in the header opens a Settings dialog for API key and printer configuration.

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
- **Printing**: @thiagoelg/node-printer (native module, Node 20 only)
- **Package manager**: Yarn
- **Linter / Formatter**: Biome (single quotes, semicolons as needed)
- **Node version**: 20 (pinned via `.nvmrc`)

## Architecture

### Folder Structure
```
app/                          # Next.js App Router — routes, layouts, API routes
  api/logs/route.ts           # GET all, POST new log
  api/logs/[id]/route.ts      # PUT update, DELETE log
  api/ai/recommendation/route.ts  # POST — calls Claude, optionally prints result
  api/settings/route.ts       # GET/PUT settings singleton
  api/printers/route.ts       # GET available printers from node-printer
  layout.tsx                  # Root layout — wraps with <Providers>
  providers.tsx               # Client: Redux Provider + MUI ThemeProvider + SnackbarProvider
  HomeLayout.tsx              # Client: owns collapsed state, 75/25 vertical split
  page.tsx                    # Home page — renders <HomeLayout>
features/                     # Feature modules (co-located components, hooks, types)
  logs/
    components/
      LogCard.tsx             # Single day card with edit/delete buttons
      LogForm.tsx             # MUI Dialog + react-hook-form + yup for add/edit
      LogList.tsx             # Main view: header, card stack, loading/error states, snackbars, settings trigger
    hooks/
      useLogs.ts              # Wraps RTK Query hooks (add, update, remove, sorted list)
    types.ts                  # DailyLog, LogFormValues types
    index.ts                  # Barrel export
  ai/
    components/
      AiRecommendation.tsx    # Collapsible purple panel; "Get Advice" button; ReactMarkdown rendering
    types.ts                  # AiRecommendationResponse
    index.ts
  settings/
    components/
      SettingsDialog.tsx      # MUI Dialog with AI key field + printer select dropdown
    types.ts                  # AppSettings, SettingsFormValues, Printer
    index.ts
  resume/                     # Placeholder feature
  interview/                  # Placeholder feature
  jobs/                       # Placeholder feature
components/
  ui/                         # Primitive shared UI (empty, ready to fill)
hooks/
  redux.ts                    # Typed useAppDispatch / useAppSelector
lib/
  api.ts                      # RTK Query createApi — all endpoints incl. AI, settings, printers
  store.ts                    # Redux configureStore (API slice only)
  prisma.ts                   # PrismaClient singleton (uses PrismaPg adapter)
  utils.ts                    # cn() class merge utility
  generated/prisma/           # Prisma-generated client (gitignored)
types/
  index.ts                    # Global shared types (ApiResponse<T>)
prisma/
  schema.prisma               # DailyLog + Settings models
prisma.config.ts              # Prisma 7 config (datasource URL from env)
scripts/
  preinstall.js               # Removes auto-build install script from node-printer before yarn installs
  postinstall.js              # Patches binding.gyp (python3, c++17) then rebuilds node-printer
.nvmrc                        # Pins Node 20
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
  defaultPrinter  String?
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
- `app/api/ai/recommendation/route.ts` — reads API key from DB settings (falls back to `ANTHROPIC_API_KEY` env var)
- Sends full log history to Claude with today's date; prompts for 2-4 sentence actionable advice for today
- If `settings.defaultPrinter` is set, strips markdown from the response and prints it via node-printer after generation
- `AiRecommendation.tsx` — collapsible panel (40vh expanded / 49px collapsed); uses `getAiRecommendation` RTK mutation; renders response through react-markdown

## Settings Feature
- Gear icon (SettingsIcon) in LogList header opens `SettingsDialog`
- Two sections: **AI Integration** (Anthropic API key, password field with show/hide toggle) and **Printing** (printer dropdown with refresh button)
- Queries skip when dialog is closed (`skip: !open`)
- Printer list fetched from `api/printers` which uses `require('@thiagoelg/node-printer')` at runtime
- Settings saved to DB via upsert; API key overrides env var for AI calls

## Node-Printer Setup
`@thiagoelg/node-printer` is a native Node addon that requires Node 20 (Node 24 is incompatible with `nan`).
- `scripts/preinstall.js` — strips the auto-install hook from the package before yarn installs it
- `scripts/postinstall.js` — patches `binding.gyp` (`c++14` → `c++17`, `python` → `python3`) then rebuilds with node-gyp
- `next.config.ts` has `serverExternalPackages: ['@thiagoelg/node-printer']` so Next.js doesn't bundle it
- Loaded via `require()` at runtime (not `import`) in API routes for Next.js compatibility

## Setup Commands
```bash
# Use correct Node version
nvm use 20

# Install deps — use setup script to avoid node-printer rebuild issues on yarn add
yarn setup

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
```
Set in `.env` (used by both Prisma CLI and Next.js runtime) — `.env*` is gitignored.
The Anthropic API key is stored in the `Settings` DB table (plain text) and configured via the Settings dialog. There is no env var fallback.

## What's Next (Planned)
- Auth (user accounts)
- Resume, Interview, and Jobs features (placeholder folders exist)
