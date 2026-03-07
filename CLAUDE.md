# FSH AI Job Coach — Claude Context

## Instructions for Claude
Keep this file up to date. After any session where new libraries are added, architectural decisions are made, conventions are established, or features are built, update the relevant sections of this file. If a section becomes outdated, correct it. This file is the source of truth for project context across conversations.

## Project Overview
An AI-powered job search coaching app. The core MVP is a daily activity log where users record what they did each day in their job search. The long-term vision is to feed that log data to an AI to get personalized, actionable next-step recommendations.

## Tech Stack
- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript (strict)
- **UI**: Material UI v7 + MUI Icons
- **State / Data fetching**: Redux Toolkit + RTK Query
- **Forms**: React Hook Form + Yup + @hookform/resolvers
- **Notifications**: notistack (SnackbarProvider)
- **Database**: PostgreSQL via Prisma 7 (driver adapter: @prisma/adapter-pg)
- **Package manager**: Yarn
- **Linter / Formatter**: Biome (single quotes, semicolons as needed)

## Architecture

### Folder Structure
```
app/                        # Next.js App Router — routes, layouts, API routes
  api/logs/route.ts         # GET all, POST new log
  api/logs/[id]/route.ts    # PUT update, DELETE log
  layout.tsx                # Root layout — wraps with <Providers>
  providers.tsx             # Client: Redux Provider + MUI ThemeProvider + SnackbarProvider
  page.tsx                  # Home page — renders <LogList>
features/                   # Feature modules (co-located components, hooks, types)
  logs/
    components/
      LogCard.tsx           # Single day card with edit/delete buttons
      LogForm.tsx           # MUI Dialog + react-hook-form + yup for add/edit
      LogList.tsx           # Main view: header, card stack, loading/error states, snackbars
    hooks/
      useLogs.ts            # Wraps RTK Query hooks (add, update, remove, sorted list)
    store/
      logsSlice.ts          # Unused (replaced by RTK Query) — kept as placeholder
    types.ts                # DailyLog, LogFormValues types
    index.ts                # Barrel export
  resume/                   # Placeholder feature
  interview/                # Placeholder feature
  jobs/                     # Placeholder feature
components/
  ui/                       # Primitive shared UI (empty, ready to fill)
  index.ts
hooks/
  redux.ts                  # Typed useAppDispatch / useAppSelector
  index.ts
lib/
  api.ts                    # RTK Query createApi — getLogs, addLog, updateLog, deleteLog
  store.ts                  # Redux configureStore (API slice only)
  prisma.ts                 # PrismaClient singleton (uses PrismaPg adapter)
  utils.ts                  # cn() class merge utility
  generated/prisma/         # Prisma-generated client (gitignored)
types/
  index.ts                  # Global shared types (ApiResponse<T>)
prisma/
  schema.prisma             # DailyLog model with @unique date constraint
prisma.config.ts            # Prisma 7 config (datasource URL from env)
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

### DailyLog Model
```prisma
model DailyLog {
  id        String   @id @default(cuid())
  date      String   @unique   // one entry per day enforced at DB + app level
  content   String
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

### Key Constraint
Only one log entry per date is allowed. This is enforced:
1. DB level — `@unique` on `date`
2. API level — catches Prisma error `P2002`, returns `409`
3. Form level — yup `.test()` checks `existingDates` before submission

## Key Conventions
- All components that use hooks or browser APIs are `'use client'`
- API routes live under `app/api/` and use Next.js 16 async params: `{ params }: { params: Promise<{ id: string }> }`
- RTK Query mutations return results — always check `'error' in result` before showing success
- Snackbars via `useSnackbar()` from notistack for all user-facing feedback
- Form validation via Yup schemas passed through `yupResolver`
- Biome enforces single quotes and semicolons only as needed

## Setup Commands
```bash
# Install deps
yarn

# Generate Prisma client (after schema changes)
npx prisma generate

# Run DB migration
npx prisma migrate dev --name <migration-name>

# Dev server
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
```
Set in `.env` (used by Prisma CLI) — `.env*` is gitignored.

## What's Next (Planned)
- AI integration: feed the log history to Claude to generate next-step recommendations
- Auth (user accounts)
- Resume, Interview, and Jobs features (placeholder folders exist)
