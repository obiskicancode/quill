
FROM node:20-alpine AS base

ENV NEXT_TELEMETRY_DISABLED=1

# Runtime compatibility libraries
RUN apk add --no-cache \
    libc6-compat \
    libstdc++

# Install dependencies
FROM base AS deps

WORKDIR /app

# Native module compilation dependencies and Node.js headers
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    linux-headers \
    nodejs-dev

# Enable pnpm via Corepack
RUN corepack enable pnpm

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

# Use Alpine's locally installed Node.js headers
ENV npm_config_nodedir=/usr

RUN --mount=type=cache,id=pnpm,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile

# Build the application
FROM base AS builder

WORKDIR /app

RUN corepack enable pnpm

COPY --from=deps /app/node_modules ./node_modules
COPY . .

ARG NEXT_PUBLIC_BASE_URL
ARG NEXT_PUBLIC_CONTACT_ADDRESS
ARG NEXT_PUBLIC_MAILING_ADDRESS
ARG NEXT_PUBLIC_GA_ID

ENV NEXT_PUBLIC_BASE_URL=$NEXT_PUBLIC_BASE_URL
ENV NEXT_PUBLIC_CONTACT_ADDRESS=$NEXT_PUBLIC_CONTACT_ADDRESS
ENV NEXT_PUBLIC_MAILING_ADDRESS=$NEXT_PUBLIC_MAILING_ADDRESS
ENV NEXT_PUBLIC_GA_ID=$NEXT_PUBLIC_GA_ID

RUN pnpm build

# Production runtime
FROM base AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3002
ENV HOSTNAME=0.0.0.0

RUN addgroup --system --gid 1001 nodejs \
    && adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public

COPY --from=builder --chown=nextjs:nodejs \
    /app/.next/standalone ./

COPY --from=builder --chown=nextjs:nodejs \
    /app/.next/static ./.next/static

USER nextjs

EXPOSE 3002

CMD ["node", "server.js"]
