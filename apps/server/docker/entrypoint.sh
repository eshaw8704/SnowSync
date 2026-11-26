#!/bin/sh
# Builds DATABASE_URL from the parts ECS injects (DB_HOST, DB_PORT, DB_NAME, DB_USERNAME,
# DB_PASSWORD), then runs the command. A DATABASE_URL that's already set (local docker run) is
# left alone. The generated password never contains URL-special characters (infra/lib/dataStack.ts).
set -eu

if [ -z "${DATABASE_URL:-}" ] && [ -n "${DB_HOST:-}" ]; then
  DATABASE_URL="postgresql://${DB_USERNAME}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT:-5432}/${DB_NAME:-snowsync}?schema=public&sslmode=verify-full&sslrootcert=/etc/ssl/rds-global-bundle.pem"
  export DATABASE_URL
fi

exec "$@"