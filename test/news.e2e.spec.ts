import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
const request = require('supertest');

import { ArtigosController } from '@/artigos/controllers/artigos.controller';
import { ArtigosService } from '@/artigos/artigos.service';

describe('News (e2e) - list', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const mockService: any = {
      listByCursor: jest
        .fn()
        .mockResolvedValue({
          items: [{ id: 1, titulo: 'a', reacoes: { CURTIDA: 2 } }],
          nextCursor: null,
        }),
      listByPage: jest.fn().mockResolvedValue({ items: [], nextPage: null }),
    };

    const moduleRef = await Test.createTestingModule({
      controllers: [ArtigosController],
      providers: [{ provide: ArtigosService, useValue: mockService }],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    if (app) await app.close();
  });

  it('GET /news returns items with reacoes', async () => {
    const res = await request(app.getHttpServer()).get('/news');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.items)).toBe(true);
    expect(res.body.items[0]).toHaveProperty('reacoes');
  });
});
