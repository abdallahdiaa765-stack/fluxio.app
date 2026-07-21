import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import helmet from 'helmet';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);

  // Security
  app.use(helmet());
  app.use(compression());
  app.use(cookieParser());

  // CORS - FRONTEND_URL can be a comma-separated list (e.g.
  // "http://localhost:3000,http://192.168.1.5:3000") so testing the web app
  // from a phone over LAN doesn't break access from the dev machine itself.
  const allowedOrigins = (configService.get('FRONTEND_URL') || 'http://localhost:3000')
    .split(',')
    .map((o: string) => o.trim());
  app.enableCors({
    origin: allowedOrigins,
    credentials: true,
  });

  // Validation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    })
  );

  // Global prefix
  app.setGlobalPrefix('api/v1');

  const port = configService.get('PORT') || 3001;
  // Explicit '0.0.0.0' so other devices on the same network (e.g. a phone
  // used for testing) can reach this server via the machine's LAN IP -
  // binding to the default host can otherwise resolve to localhost only.
  await app.listen(port, '0.0.0.0');

  console.log(`🚀 Fluxio API running on http://localhost:${port}/api/v1`);
}

bootstrap();
