import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
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
    process.env.FRONTEND_URL_DEV,
    process.env.FRONTEND_URL_PROD,
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

  app.use(cookieParser());

  const port = process.env.PORT || 8080;

  const config = new DocumentBuilder()
    .setTitle('UFC Quixadá News API')
    .setDescription('API do jornal de notícias (admin + público)')
    .setVersion('1.0')
    .addBearerAuth()
    .addCookieAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document);

  await app.listen(port);
  Logger.log(`Application is running on: http://localhost:${port}`);
  Logger.log(`Swagger is running on: http://localhost:${port}/docs`);
}
void bootstrap();
