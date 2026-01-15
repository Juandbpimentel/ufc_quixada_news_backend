import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
const request = require('supertest');
import nock from 'nock';

import { AuthController } from '@/auth/controllers/auth.controller';
import { PasswordResetService } from '@/auth/password-reset.service';
import { MeuContatoService } from '@/auth/meu-contato.service';
import { PrismaService } from '@/prisma/prisma.service';
import { AuthService } from '@/auth/services/auth.service';

describe('Auth (e2e) - password reset', () => {
  let app: INestApplication;

  beforeAll(async () => {
    // minimal test app with only the controller and required services
    const mockPrisma: any = {
      usuario: {
        findFirst: jest.fn().mockResolvedValue({
          id: 2,
          nome: 'Test User',
          email: 'noone@example.com',
        }),
      },
      passwordResetToken: {
        create: jest.fn().mockResolvedValue({}),
        findUnique: jest.fn(),
        update: jest.fn(),
      },
    };

    const moduleRef = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        PasswordResetService,
        MeuContatoService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: AuthService, useValue: {} },
        {
          provide: require('@/users/users.service').UsuariosService,
          useValue: { rotateTokenVersion: jest.fn() },
        },
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();
  }, 20000);

  afterAll(async () => {
    if (app) await app.close();
  });

  test('forgot-password should call MeuContato and return ok', async () => {
    const meuContatoUrl = (
      process.env.MEUCONTATO_URL || 'https://meucontato-backend.onrender.com'
    ).replace(/\/+$/, '');
    const scope = nock(meuContatoUrl).post('/contact').reply(200, { ok: true });

    const res = await request(app.getHttpServer())
      .post('/auth/forgot-password')
      .send({ email: 'noone@example.com' });
    expect([200, 201]).toContain(res.status);
    expect(res.body).toEqual({ ok: true });
    expect(scope.isDone()).toBe(true);
  });
});
