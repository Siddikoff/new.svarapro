ARG NODE_IMAGE=node:20.17.0-alpine

# Base stage with pnpm
FROM ${NODE_IMAGE} AS base
WORKDIR /app
RUN npm install -g pnpm
RUN apk add --no-cache libc6-compat

# Dependencies stage
FROM base AS deps
# Copy workspace configuration
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
# Copy package.json files for workspace packages
COPY server/package.json ./server/package.json
COPY bot/package.json ./bot/package.json
COPY service-bot/package.json ./service-bot/package.json

# Install only production dependencies for server and bot
RUN pnpm install --prod --frozen-lockfile --filter svara-pro-server --filter svara-pro-bot --filter svara-pro-service-bot

# Build dependencies stage
FROM base AS build-deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY server/package.json ./server/package.json
COPY bot/package.json ./bot/package.json
COPY service-bot/package.json ./service-bot/package.json

# Install all dependencies including dev dependencies
RUN pnpm install --frozen-lockfile --filter svara-pro-server --filter svara-pro-bot --filter svara-pro-service-bot

# Build stage
FROM build-deps AS builder
# Copy source code with individual tsconfig files
COPY server/ ./server/
COPY bot/ ./bot/
COPY service-bot/ ./service-bot/

# Build server, bot and service-bot
RUN pnpm --filter svara-pro-server build
RUN pnpm --filter svara-pro-bot build
RUN pnpm --filter svara-pro-service-bot build

# Runtime stage
FROM ${NODE_IMAGE} AS runner
WORKDIR /app
ENV NODE_ENV=production

# Create non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nodejs

# Install PM2 globally
RUN npm install -g pm2

# Copy production node_modules
COPY --from=deps --chown=nodejs:nodejs /app/node_modules ./node_modules
COPY --from=deps --chown=nodejs:nodejs /app/server/node_modules ./server/node_modules
COPY --from=deps --chown=nodejs:nodejs /app/bot/node_modules ./bot/node_modules
COPY --from=deps --chown=nodejs:nodejs /app/service-bot/node_modules ./service-bot/node_modules

# Copy built applications
COPY --from=builder --chown=nodejs:nodejs /app/server/dist ./server/dist
COPY --from=builder --chown=nodejs:nodejs /app/bot/dist ./bot/dist
COPY --from=builder --chown=nodejs:nodejs /app/service-bot/dist ./service-bot/dist

# Copy configuration files
COPY --chown=nodejs:nodejs package.json ecosystem.config.js ./
COPY --chown=nodejs:nodejs server/package.json ./server/package.json
COPY --chown=nodejs:nodejs bot/package.json ./bot/package.json
COPY --chown=nodejs:nodejs service-bot/package.json ./service-bot/package.json

RUN mkdir -p /app/logs && chown -R nodejs:nodejs /app/logs

USER nodejs
EXPOSE 3000
CMD ["pm2-runtime", "start", "ecosystem.config.js"]
