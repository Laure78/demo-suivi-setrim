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
# DATABASE_URL est injecté par Railway au build (ne pas l'écraser avec un ARG)
RUN npx prisma generate \
  && if [ -n "$DATABASE_URL" ] && echo "$DATABASE_URL" | grep -qv localhost; then \
       echo "Prisma db push (prod)…" && npx prisma db push --skip-generate; \
     else \
       echo "Skip db push (pas de DATABASE_URL prod)"; \
     fi \
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
