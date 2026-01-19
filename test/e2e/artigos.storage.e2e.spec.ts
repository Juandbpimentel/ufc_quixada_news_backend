import { Test } from '@nestjs/testing';
import { INestApplication, CanActivate } from '@nestjs/common';
const request = require('supertest');
import * as path from 'path';

// ensure local .env is loaded early so top-level checks see the variables
require('dotenv').config({ path: path.resolve(__dirname, '..', '..', '.env') });

import { GerenciarArtigosController } from '@/artigos/controllers/gerenciar-artigos.controller';
import { ArtigosService } from '@/artigos/artigos.service';
import { FirebaseStorageService } from '@/storage/firebase-storage.service';
import { PrismaService } from '@/prisma/prisma.service';

// guard de teste que injeta `req.user` e permite acesso
const allowAllGuard: CanActivate = {
  canActivate: (ctx: any) => {
    const req = ctx.switchToHttp().getRequest();
    req.user = {
      id: 1,
      nome: 'Test User',
      email: 'test@example.com',
      papel: 'ADMINISTRADOR',
    };
    return true;
  },
} as any;

// 1x1 PNG data URL (very small)
const ONE_PX_PNG =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVQYV2NgYAAAAAMAAWgmWQ0AAAAASUVORK5CYII=';

jest.setTimeout(30000);

const FIREBASE_CONFIGURED = Boolean(
  process.env.FIREBASE_PROJECT_ID &&
  (process.env.FIREBASE_PRIVATE_KEY || process.env.FIREBASE_PRIVATE_KEY_B64) &&
  process.env.FIREBASE_CLIENT_EMAIL &&
  process.env.FIREBASE_STORAGE_BUCKET,
);

describe('Artigos (e2e) - Firebase upload (integration)', () => {
  let app: INestApplication;
  let capturedUploadedUrl: string | null = null;

  beforeAll(async () => {
    // minimal Prisma stub: allow create flow but avoid real DB
    const mockPrisma: any = {
      artigo: {
        findUnique: jest.fn().mockImplementation(async (args: any) => {
          // slug-availability check (called first) -> return null
          if (args && args.where && args.where.slug) return null;
          // final fetch by id -> return an article with the uploaded URL (captured later)
          if (args && args.where && typeof args.where.id === 'number') {
            return {
              id: args.where.id,
              titulo: 'integ-test',
              resumo: null,
              capaUrl: null,
              categoria: null,
              publicado: false,
              publicadoEm: null,
              autorId: 1,
              sessoes: [
                {
                  ordem: 0,
                  tipo: 'IMAGEM',
                  texto: null,
                  imagemUrl: capturedUploadedUrl || 'about:blank',
                },
              ],
            };
          }
          return null;
        }),
        create: jest.fn().mockImplementation(async ({ data }: any) => {
          return { id: 999, ...data };
        }),
      },
      artigoSessao: { createMany: jest.fn().mockResolvedValue({ count: 1 }) },
      reacao: { findFirst: jest.fn() },
    };

    const moduleRef = await Test.createTestingModule({
      controllers: [GerenciarArtigosController],
      providers: [
        ArtigosService,
        FirebaseStorageService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    })
      .overrideProvider(FirebaseStorageService)
      .useClass(FirebaseStorageService)
      .overrideGuard(require('@/auth/guards/jwt-auth.guard').JwtAuthGuard)
      .useValue(allowAllGuard)
      .overrideGuard(require('@/auth/guards/roles.guard').RolesGuard)
      .useValue(allowAllGuard)
      .compile();

    app = moduleRef.createNestApplication();
    await app.init();

    // spy the real storage upload to capture returned URL
    const storage = app.get(FirebaseStorageService);
    const orig = storage.uploadBase64.bind(storage);
    jest
      .spyOn(storage, 'uploadBase64')
      .mockImplementation(async (dataUrl: string, dest: string) => {
        const url = await orig(dataUrl, dest);
        capturedUploadedUrl = url;
        return url;
      });
  });

  afterAll(async () => {
    if (app) await app.close();
  });

  (FIREBASE_CONFIGURED ? it : it.skip)(
    'POST /gerenciar/artigos uploads data URL to Firebase and returns artigo with imagemUrl',
    async () => {
      if (!FIREBASE_CONFIGURED) {
        console.warn(
          '\nSkipping Firebase integration test: required FIREBASE_* env vars not set.',
        );
        return;
      }

      // ensure the service actually initialized (envs can be present but invalid)
      const storage = app.get(FirebaseStorageService);
      if (!storage.isConfigured()) {
        const required = [
          'FIREBASE_PROJECT_ID',
          'FIREBASE_CLIENT_EMAIL',
          'FIREBASE_STORAGE_BUCKET',
        ];
        const hasKey = Boolean(
          process.env.FIREBASE_PRIVATE_KEY ||
          process.env.FIREBASE_PRIVATE_KEY_B64,
        );
        const missing = required.filter((k) => !process.env[k]);
        if (!hasKey)
          missing.push('FIREBASE_PRIVATE_KEY or FIREBASE_PRIVATE_KEY_B64');
        console.warn(
          'Firebase Storage failed to initialize — missing envs:',
          missing.join(', '),
        );
        console.warn(
          'Tip: prefer FIREBASE_PRIVATE_KEY_B64 (base64 of the service-account JSON) to avoid newline issues.',
        );
        // fail early with a clear message so CI/dev can act on it
        throw new Error(
          'Firebase Storage is not initialized — missing: ' +
            missing.join(', '),
        );
      }

      const payload = {
        titulo: 'integração upload imagem',
        artigoSessoes: [{ ordem: 0, tipo: 'IMAGEM', imagemUrl: ONE_PX_PNG }],
      };

      const res = await request(app.getHttpServer())
        .post('/gerenciar/artigos')
        .send(payload)
        .set('Accept', 'application/json');

      expect(res.status).toBe(201);
      expect(res.body).toBeDefined();
      expect(Array.isArray(res.body.sessoes)).toBe(true);
      const img = res.body.sessoes[0].imagemUrl;
      expect(img).toBeDefined();
      expect(img).toMatch(/storage\.googleapis\.com|firebasestorage\.app/);
      // ensure internal captured URL matches response
      expect(capturedUploadedUrl).toBeDefined();
      expect(img).toBe(capturedUploadedUrl);

      // optional: try to fetch the uploaded URL — accept any non-404 as evidence
      try {
        const fetch = (await import('node-fetch')).default;
        const r = await fetch(img, { method: 'HEAD' });
        expect(r.status).not.toBe(404);
      } catch (e) {
        // network issues are non-fatal for this assertion — just warn via console
        console.warn(
          'Could not HEAD uploaded URL (network issue):',
          (e as Error).message,
        );
      }
    },
  );
});
