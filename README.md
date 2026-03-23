# FSH AI Job Coach

An AI-powered job search coaching app built for the modern job hunt. Log your daily activity, track applications, and get actionable advice from an AI coach — all in one place.

> Part of the [Full Stack Hrivnak](https://fshjobcoach.com) suite of tools.

## Features

- **Daily activity log** — record what you did each day in your job search
- **Job application tracker** — track status, priority, recruiter info, compensation, and notes per application
- **AI daily coach** — get personalized, actionable recommendations based on your recent activity
- **AI writing assistant** — get help with cover letters, emails, and anything else you need to write
- **Auto-fill from URL** — paste a job posting URL and let AI extract the details
- **Fit score** — AI rates how well a job matches your career profile and resume (Strong / Good / Partial / Weak)
- **Desktop agent integration** — connects to an Electron companion app via WebSocket; AI-filters incoming emails and calendar events and surfaces relevant ones as in-app notifications
- **Email notifications** — relevant job search emails (recruiter intros, interview requests, offers, etc.) appear as in-app notifications with dismiss and clear-all; auto-expire after 90 days
- **Agent file sync** — browse, download, upload, and delete files in the agent's watched folder directly from the webapp; changes sync in real time via WebSocket
- **ESC/POS printing** — print your daily coaching report to a receipt printer (Chrome/Edge + HTTPS)
- **Dark mode** — because you'll be using this a lot

## Stack

- [Next.js 16](https://nextjs.org) (App Router) + TypeScript
- [Material UI v7](https://mui.com)
- [Redux Toolkit](https://redux-toolkit.js.org) + RTK Query
- [Prisma 7](https://prisma.io) + PostgreSQL
- [Anthropic Claude](https://anthropic.com) (`claude-sonnet-4-6` / `claude-haiku-4-5`)
- WebSocket relay server (`ws`) for desktop agent integration
- Deployed on AWS Fargate via CDK

## Self-Hosting

### Prerequisites

- Node 24
- PostgreSQL database
- Anthropic API key (configured in-app via Settings)

### Setup

```bash
# Install dependencies
yarn

# Generate Prisma client
yarn prisma generate

# Run migrations
yarn prisma migrate deploy

# Start dev server
yarn dev
```

### Environment

```env
DATABASE_URL=postgresql://user:password@localhost:5432/fsh_job_coach
SESSION_SECRET=<random-string-at-least-32-chars>
```

### Docker

```bash
docker build -t fsh-job-coach .
docker run -p 3000:3000 \
  -e DATABASE_URL=... \
  -e SESSION_SECRET=... \
  fsh-job-coach
```

## Status

Currently self-hosted for personal use. Public availability planned for a future release.
