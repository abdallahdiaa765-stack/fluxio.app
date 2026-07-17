# Dockerfile for apps/api (NestJS) — used by Back4app Containers
#
# افتراضات لازم تتأكد منها في الريبو الكامل بتاعك (الزيب اللي رفعتلي جزء منه بس):
#   - عندك pnpm-workspace.yaml في الجذر بيحدد apps/* و packages/*
#   - apps/api/package.json فيه scripts: "build" و "start:prod" (أو dist/main.js بعد الـ build)
#   - packages/database فيها Prisma schema، وعندها script "db:generate"
#
# لو أسماء الـ packages مختلفة عندك، عدّل أسطر --filter تحت.

FROM node:20-alpine AS builder
RUN corepack enable
WORKDIR /app

# ننسخ ملفات التبعيات الأول عشان الـ Docker layer caching يشتغل صح
COPY package.json pnpm-lock.yaml* pnpm-workspace.yaml* turbo.json ./
COPY packages ./packages
COPY apps/api ./apps/api

RUN pnpm install --frozen-lockfile

# توليد Prisma Client
RUN pnpm --filter database run db:generate || pnpm turbo run db:generate --filter=database

# بناء الـ API بس (مش الـ web)
RUN pnpm turbo run build --filter=api...

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3001

COPY --from=builder /app ./

EXPOSE 3001

# بيجهز جداول قاعدة البيانات تلقائيًا كل مرة السيرفر يبدأ (آمن، مش هيمسح بيانات موجودة)
# قبل ما يشغل السيرفر نفسه — كده مش محتاج تشغل أي أمر من جهازك خالص
CMD sh -c "node_modules/.bin/prisma migrate deploy --schema=packages/database/prisma/schema.prisma && node apps/api/dist/main.js"
