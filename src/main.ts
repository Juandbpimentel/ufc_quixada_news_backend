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

  const allowedOrigins = [
    process.env.FRONTEND_URL,
    process.env.PUBLIC_API_URL,
    'http://localhost:3000',
  ].filter(Boolean);

  app.enableCors({
    origin: (
      origin: string | undefined,
      callback: (err: Error | null, allow?: boolean) => void,
    ) => {
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) return callback(null, true);
      return callback(new Error('Origin not allowed by CORS'));
    },
    credentials: true,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
  });

  const port = process.env.PORT || 8080;

  const config = new DocumentBuilder()
    .setTitle('UFC Quixadá News API')
    .setDescription('API do jornal de notícias (admin + público)')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document);

  // store the generated OpenAPI document so it can be served via /openapi.json
  try {
    const swaggerDocService = app.get(SwaggerDocumentService);
    swaggerDocService.setDocument(document);
  } catch (err) {
    // if the service is not available for some reason, ignore
  }

  await app.listen(port);
  const url = process.env.PUBLIC_API_URL || `http://localhost:${port}`;
  Logger.log(`Application is running on: ${url}`);
  Logger.log(`Swagger is running on: ${url}/docs`);
}
void bootstrap();
