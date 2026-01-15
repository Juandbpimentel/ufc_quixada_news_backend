import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
const request = require('supertest');

import { AuthController } from '@/auth/controllers/auth.controller';
import { AuthService } from '@/auth/services/auth.service';

describe('Auth (e2e) - login', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const mockAuth: any = {
      login: jest
        .fn()
        .mockResolvedValue({
          token: 'jwt',
          user: { id: 1, papel: 'ESTUDANTE' },
        }),
    };

    const moduleRef = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [{ provide: AuthService, useValue: mockAuth }],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    if (app) await app.close();
  });

  it('POST /auth/login returns token and user', async () => {
    const res = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ login: 'u', senha: 's' });
    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('token');
    expect(res.body.user).toHaveProperty('papel');
  });
});
