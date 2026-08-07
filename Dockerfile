FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
COPY prisma ./prisma
RUN npm install

FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
# Railway injecte DATABASE_URL au build — on pousse le schéma ici
ARG DATABASE_URL
ENV DATABASE_URL=${DATABASE_URL:-postgresql://setrim:setrim@localhost:5432/setrim}
RUN npx prisma generate \
  && (npx prisma db push --skip-generate || echo "db push skip — pas de Postgres joignable au build") \
  && npx next build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV HOSTNAME=0.0.0.0
ENV PORT=3000
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
COPY scripts/railway-start.sh ./railway-start.sh
RUN chmod +x railway-start.sh

USER nextjs
EXPOSE 3000
CMD ["sh", "railway-start.sh"]
