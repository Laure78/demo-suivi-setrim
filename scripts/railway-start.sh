#!/bin/sh
set -e
echo "Prisma db push…"
npx prisma db push --skip-generate
echo "Démarrage Next.js…"
exec node server.js
