# SnowSync server image (SS-35). Build from the repository root:
# docker build -f apps/server/Dockerfile -t snowsync-server .
# Non-root, includes the Prisma client and migrations, /health check. No secrets: ECS injects them.

# Deps: install only the server and shared workspaces
FROM node:24-bookworm-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
COPY packages/shared/package.json packages/shared/
COPY apps/server/package.json apps/server/
# The lockfile lists every workspace, so their package.json files must exist.
COPY apps/mobile/package.json apps/mobile/
COPY infra/package.json infra/
RUN npm ci --workspace @snowsync/server --workspace @snowsync/shared --ignore-scripts

# Build: generate the Prisma client
FROM deps AS build
# apps/server/tsconfig.json extends this file; Prisma's config and tsx both need it.
COPY tsconfig.base.json ./
COPY packages/shared packages/shared
COPY apps/server apps/server
RUN npm run db:generate --workspace @snowsync/server

# Runtime
FROM node:24-bookworm-slim AS runtime
ENV NODE_ENV=production
WORKDIR /app
# Amazon RDS certificate bundle, so the server verifies the database's TLS certificate.
ADD https://truststore.pki.rds.amazonaws.com/global/global-bundle.pem /etc/ssl/rds-global-bundle.pem
COPY --from=build --chown=node:node /app /app
COPY --chown=node:node apps/server/docker/entrypoint.sh /usr/local/bin/snowsync-entrypoint
# Set modes here, not with ADD --chmod: that also applied 644 to the new /etc/ssl folder, which made it unreadable for the node user and stopped Node from starting.
RUN chmod 755 /etc/ssl /usr/local/bin/snowsync-entrypoint && chmod 644 /etc/ssl/rds-global-bundle.pem
USER node
WORKDIR /app/apps/server
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:' + (process.env.PORT || 3000) + '/health').then((r) => process.exit(r.ok ? 0 : 1), () => process.exit(1))"
ENTRYPOINT ["/usr/local/bin/snowsync-entrypoint"]
CMD ["npm", "start"]