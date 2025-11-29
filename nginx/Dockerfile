ARG NODE_IMAGE=node:20.17.0-alpine
ARG NGINX_IMAGE=nginx:1.27-alpine

# Base stage
FROM ${NODE_IMAGE} AS base
WORKDIR /app
RUN npm install -g pnpm
RUN apk add --no-cache libc6-compat

# Dependencies for client only
FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY client/package.json ./client/package.json

# Install only client dependencies
RUN pnpm install --frozen-lockfile --filter svara-pro-client

# Build stage
FROM deps AS builder
# Copy client source (includes its own tsconfig files)
COPY client/ ./client/

# Build arguments for environment variables
ARG VITE_APP_URL
ARG VITE_WS_URL
ARG VITE_API_URL

ENV VITE_APP_URL=$VITE_APP_URL
ENV VITE_WS_URL=$VITE_WS_URL
ENV VITE_API_URL=$VITE_API_URL

# Build client
RUN pnpm --filter svara-pro-client build

# Production stage
FROM ${NGINX_IMAGE}
# Copy built client
COPY --from=builder /app/client/dist /usr/share/nginx/html
# Copy nginx configuration
COPY nginx/default.conf /etc/nginx/conf.d/default.conf

EXPOSE 80 443
CMD ["nginx", "-g", "daemon off;"]
