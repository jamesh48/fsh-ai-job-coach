FROM node:20-slim

WORKDIR /app

# Build deps for @thiagoelg/node-printer (CUPS)
RUN apt-get update && apt-get install -y \
    libcups2-dev \
    libcups2 \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

# Install dependencies (ignore scripts, then manually run postinstall to build node-printer)
COPY package.json yarn.lock ./
COPY scripts/ ./scripts/
RUN yarn install --ignore-scripts && node scripts/postinstall.js

# Generate Prisma client
COPY prisma/ ./prisma/
COPY prisma.config.ts ./
RUN npx prisma generate

# Build Next.js
COPY . .
RUN yarn build

ENV NODE_ENV=production
EXPOSE 3000

# Migrate on startup, then serve
CMD ["sh", "-c", "npx prisma migrate deploy && npx next start -p 3000"]
