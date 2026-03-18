FROM node:24-slim

WORKDIR /app

RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile

COPY prisma/ ./prisma/
COPY prisma.config.ts ./
RUN yarn prisma generate

COPY . .
RUN yarn build

ENV NODE_ENV=production
EXPOSE 3000

CMD ["sh", "-c", "yarn prisma migrate deploy && yarn tsx server.ts"]
