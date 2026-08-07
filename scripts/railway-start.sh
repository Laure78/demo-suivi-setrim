#!/bin/sh
set -e
echo "Prisma db push…"
prisma db push --skip-generate --schema=./prisma/schema.prisma
echo "Démarrage Next.js…"
exec node server.js
