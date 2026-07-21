import type { VercelRequest, VercelResponse } from '@vercel/node';
import { NestFactory } from '@nestjs/core';
import { ExpressAdapter } from '@nestjs/platform-express';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import helmet from 'helmet';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import express from 'express';
import { AppModule } from '../src/app.module';

/**
 * Vercel serverless entrypoint for the NestJS API.
 *
 * A serverless function's handler runs fresh on a cold start but is reused
 * on subsequent "warm" invocations of the same instance, so we cache the
 * bootstrapped Nest app in `cachedServer` instead of recreating it (and
 * reconnecting Prisma/Redis) on every single request - that would be slow
 * and would exhaust the DB connection pool fast under any real traffic.
 *
 * This mirrors apps/api/src/main.ts (same helmet/compression/cookieParser/
 * ValidationPipe/CORS/global prefix setup) but hands the underlying Express
 * instance to Vercel's request handler instead of calling app.listen().
 */
let cachedServer: express.Express | null = null;

async function bootstrapServer(): Promise<express.Express> {
  const expressApp = express();
  const adapter = new ExpressAdapter(expressApp);
  const app = await NestFactory.create(AppModule, adapter);
  const configService = app.get(ConfigService);

  app.use(helmet());
  app.use(compression());
  app.use(cookieParser());

  const allowedOrigins = (configService.get('FRONTEND_URL') || 'http://localhost:3000')
    .split(',')
    .map((o: string) => o.trim());
  app.enableCors({
    origin: allowedOrigins,
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    })
  );

  app.setGlobalPrefix('api/v1');

  await app.init();
  return expressApp;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!cachedServer) {
    cachedServer = await bootstrapServer();
  }
  cachedServer(req as any, res as any);
}
