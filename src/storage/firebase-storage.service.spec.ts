// use CommonJS style mock so jest can transform file
jest.mock('firebase-admin', () => ({
  initializeApp: jest.fn(),
  credential: { cert: jest.fn() },
  storage: () => ({
    bucket: () => ({
      name: 'test-bucket',
      file: (path: string) => ({
        save: jest.fn().mockResolvedValue(undefined),
        makePublic: jest.fn().mockResolvedValue(undefined),
        getSignedUrl: jest
          .fn()
          .mockResolvedValue([`https://signed.example/${path}`]),
      }),
    }),
  }),
}));

import { describe, it, expect, beforeAll } from '@jest/globals';
import { FirebaseStorageService } from './firebase-storage.service';

describe('FirebaseStorageService', () => {
  it('is not configured when env vars are missing', () => {
    // ensure env vars are not set
    delete process.env.FIREBASE_PRIVATE_KEY;
    delete process.env.FIREBASE_PRIVATE_KEY_B64;
    delete process.env.FIREBASE_PROJECT_ID;
    delete process.env.FIREBASE_CLIENT_EMAIL;
    delete process.env.FIREBASE_STORAGE_BUCKET;

    const svc = new FirebaseStorageService();
    expect(svc.isConfigured()).toBe(false);
    return expect(
      svc.uploadBase64('data:image/png;base64,AAA', 'x'),
    ).rejects.toThrow('Firebase Storage not configured');
  });

  it('can upload when properly configured', async () => {
    // set minimal env using a base64 encoded service account JSON with private_key
    const sa = {
      private_key:
        '-----BEGIN PRIVATE KEY-----\nABC\n-----END PRIVATE KEY-----',
      project_id: 'proj',
      client_email: 'a@b.c',
      storageBucket: 'test-bucket',
    };
    process.env.FIREBASE_PRIVATE_KEY_B64 = Buffer.from(
      JSON.stringify(sa),
    ).toString('base64');
    delete process.env.FIREBASE_PRIVATE_KEY;
    process.env.FIREBASE_PROJECT_ID = sa.project_id;
    process.env.FIREBASE_CLIENT_EMAIL = sa.client_email;
    process.env.FIREBASE_STORAGE_BUCKET = sa.storageBucket;

    const svc = new FirebaseStorageService();
    expect(svc.isConfigured()).toBe(true);

    const url = await svc.uploadBase64(
      'data:image/png;base64,SGVsbG8=',
      'path/pic.png',
    );
    expect(typeof url).toBe('string');
    expect(
      url.includes('storage.googleapis.com') || url.includes('signed.example'),
    ).toBe(true);
  });
});
