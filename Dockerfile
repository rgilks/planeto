# Dockerfile

# Stage 1: Install dependencies and build the application
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci

FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Ensure all files are owned by the node user for security
RUN chown -R node:node /app
USER node

ENV NEXT_TELEMETRY_DISABLED 1

RUN npm run build

# Stage 2: Production image
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV production
ENV NEXT_TELEMETRY_DISABLED 1
ENV PORT 3000
ENV HOSTNAME 0.0.0.0 # Explicitly set hostname to listen on all interfaces

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy package.json, as it might be needed by some modules at runtime or for specific Next.js features.
COPY --from=builder --chown=nextjs:nodejs /app/package.json ./package.json

# Copy the full node_modules from the builder stage.
# This ensures all dependencies, including native ones that might not be fully traced
# by the standalone output, are present. This is a common fix for native module issues.
COPY --from=builder --chown=nextjs:nodejs /app/node_modules ./node_modules

# Copy the standalone output. This includes server.js and expects associated files
# (like .next/static and public) to be relative to it, which this copy achieves.
# If standalone itself includes a node_modules, it might overwrite parts of the above copy,
# but this is generally fine as server.js is built for the standalone structure.
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./

USER nextjs

EXPOSE 3000

# server.js is now in /app/server.js from the standalone copy
CMD ["node", "server.js"] 