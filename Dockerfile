FROM node:20-slim

WORKDIR /app

COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile

COPY prisma/ ./prisma/
COPY prisma.config.ts ./
RUN npx prisma generate

COPY . .
RUN yarn build

ENV NODE_ENV=production
EXPOSE 3000

CMD ["sh", "-c", "npx prisma migrate deploy && npx next start -p 3000"]
