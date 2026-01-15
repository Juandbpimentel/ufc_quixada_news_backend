import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
const request = require('supertest');
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { SwaggerDocumentService } from '../src/swagger/swagger-document.service';
import { SwaggerController } from '../src/swagger/swagger.controller';

describe('Docs (e2e) - openapi.json', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [SwaggerController],
      providers: [SwaggerDocumentService],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();

    // ensure the Swagger document is set in the SwaggerDocumentService used by the app
    const swaggerService = app.get(SwaggerDocumentService);
    if (!swaggerService.getDocument()) {
      const config = new DocumentBuilder()
        .setTitle('UFC Quixadá News API')
        .setVersion('1.0')
        .addBearerAuth()
        .build();
      const document = SwaggerModule.createDocument(app, config);
      swaggerService.setDocument(document);
    }
  }, 20000);

  afterAll(async () => {
    if (app) await app.close();
  });

  test('GET /openapi.json returns Swagger document', async () => {
    const res = await request(app.getHttpServer()).get('/openapi.json');
    expect(res.status).toBe(200);
    expect(res.body).toBeDefined();
    expect(res.body.openapi).toBeDefined();
    expect(res.body.paths).toBeDefined();
  });
});
