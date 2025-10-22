# Install dependencies
FROM oven/bun:1.3-alpine AS dependencies
WORKDIR /app
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile --production

# Build the application
FROM dependencies AS build
COPY . .
RUN bun run compile

# Create a minimal runtime image
FROM alpine:3 AS runtime
WORKDIR /app
RUN apk add --no-cache libstdc++ libgcc
COPY --from=build /app/server .
COPY --from=build /app/node_modules/@fastify/swagger-ui /app/node_modules/@fastify/swagger-ui

LABEL org.opencontainers.image.source=https://github.com/zeepkist/backend
LABEL org.opencontainers.image.description="Backend service for GTR"
LABEL org.opencontainers.image.licenses=MIT

ENV ENABLE_WORKERS=true

EXPOSE 3000/tcp
CMD ["./server"]
