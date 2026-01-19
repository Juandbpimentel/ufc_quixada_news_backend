import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { SwaggerDocumentService } from './swagger/swagger-document.service';
import { Logger, ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Aggregate allowed origins from multiple env vars into a canonical set.
  // Sources (comma-separated supported): ALLOWED_CLIENTS_ORIGIN, allowed_clients_origin, FRONTEND_URL, PUBLIC_API_URL
  const sources = [
    process.env.ALLOWED_CLIENTS_ORIGIN,
    process.env.allowed_clients_origin,
    process.env.FRONTEND_URL,
    process.env.PUBLIC_API_URL,
  ].filter(Boolean) as string[];

  // join all sources, split by comma, normalize and dedupe
  const combined = sources.join(',');
  const rawCandidates = String(combined)
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  // normalize special cases: accept '/' as alias for '*'
  const normalized = rawCandidates.map((v) => (v === '/' ? '*' : v));

  // build set and remove invalid origins (paths like "/" are normalized above)
  const originSet = new Set<string>(normalized);

  // if nothing provided, default to '*'
  if (originSet.size === 0) originSet.add('*');

  const allowedOrigins = Array.from(originSet);
  Logger.log('Allowed origins: ' + JSON.stringify(allowedOrigins));

  app.enableCors({
    origin: (
      origin: string | undefined,
      callback: (err: Error | null, allow?: boolean) => void,
    ) => {
      // allow server-to-server requests or tools like curl (no origin)
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes('*')) return callback(null, true);
      return allowedOrigins.includes(origin)
        ? callback(null, true)
        : callback(new Error('Origin not allowed by CORS'));
    },
    credentials: true,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
  });

  const port = process.env.PORT || 8080;

  const config = new DocumentBuilder()
    .setTitle('UFC Quixadá News API')
    .setDescription('API do jornal de notícias (admin + público)')
    .setVersion('1.0')
    .addServer(process.env.PUBLIC_API_URL || `http://localhost:${port}`)
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document);

  // store the generated OpenAPI document so it can be served via /openapi.json
  try {
    const swaggerDocService = app.get(SwaggerDocumentService);
    swaggerDocService.setDocument(document);
  } catch (err) {
    Logger.error(err);
    // if the service is not available for some reason, ignore
  }

  await app.listen(port);
  const url = process.env.PUBLIC_API_URL || `http://localhost:${port}`;
  Logger.log(`Application is running on: ${url}`);
  Logger.log(`Swagger is running on: ${url}/docs`);
}
void bootstrap();
