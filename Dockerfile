FROM oven/bun:1-alpine AS base

WORKDIR /app

# Install only production dependencies
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile --production

# Copy only the necessary files
COPY drizzle ./drizzle
COPY src ./src
COPY drizzle.config.ts ./
COPY graphile.config.ts ./

USER bun
EXPOSE 3000/tcp
ENTRYPOINT ["sh", "-c", "bun run start"]
