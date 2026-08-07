#!/bin/sh
set -e
if [ -n "$DATABASE_URL" ]; then
  echo "Prisma db push…"
  if [ -x ./node_modules/.bin/prisma ]; then
    ./node_modules/.bin/prisma db push --skip-generate
  elif [ -f ./node_modules/prisma/build/index.js ]; then
    node ./node_modules/prisma/build/index.js db push --skip-generate
  else
    echo "Prisma CLI absent — skip db push (à lancer une fois via railway run)"
  fi
fi
echo "Démarrage Next.js…"
exec node server.js
