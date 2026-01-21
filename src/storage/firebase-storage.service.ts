import { Injectable, Logger } from '@nestjs/common';
import * as firebaseAdmin from 'firebase-admin';
import { Bucket } from '@google-cloud/storage';

@Injectable()
export class FirebaseStorageService {
  private logger = new Logger(FirebaseStorageService.name);
  private admin: typeof firebaseAdmin | null = null;
  private bucket: Bucket | null = null;
  private configured: boolean = false;

  // maximum allowed upload size in bytes (configurable via UPLOAD_MAX_MB)
  // default: 200 MB
  private readonly maxUploadBytes =
    Number(process.env.UPLOAD_MAX_MB ?? 200) * 1024 * 1024;

  constructor() {
    try {
      // dynamic require so project doesn't need firebase-admin unless configured
      // ENV variables expected: FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY, FIREBASE_STORAGE_BUCKET
      // support either FIREBASE_PRIVATE_KEY (escaped newlines) or FIREBASE_PRIVATE_KEY_B64
      const hasKey = !!process.env.FIREBASE_PRIVATE_KEY;
      const hasKeyB64 = !!process.env.FIREBASE_PRIVATE_KEY_B64;

      if (
        process.env.FIREBASE_PROJECT_ID &&
        process.env.FIREBASE_CLIENT_EMAIL &&
        (hasKey || hasKeyB64) &&
        process.env.FIREBASE_STORAGE_BUCKET
      ) {
        const admin = firebaseAdmin;

        let privateKey = '';

        if (hasKeyB64) {
          // decode base64 input
          const decoded = Buffer.from(
            process.env.FIREBASE_PRIVATE_KEY_B64 as string,
            'base64',
          ).toString('utf8');
          try {
            // if it's a JSON service account, parse and extract private_key
            const parsed: unknown = JSON.parse(decoded);
            if (
              typeof parsed === 'object' &&
              parsed !== null &&
              'private_key' in parsed &&
              typeof (parsed as { private_key?: unknown }).private_key ===
                'string'
            ) {
              const obj = parsed as {
                private_key: string;
                project_id?: string;
                client_email?: string;
                storageBucket?: string;
                bucket?: string;
              };
              privateKey = obj.private_key;
              // fill missing envs if not set
              process.env.FIREBASE_PROJECT_ID =
                process.env.FIREBASE_PROJECT_ID || obj.project_id;
              process.env.FIREBASE_CLIENT_EMAIL =
                process.env.FIREBASE_CLIENT_EMAIL || obj.client_email;
              process.env.FIREBASE_STORAGE_BUCKET =
                process.env.FIREBASE_STORAGE_BUCKET ||
                obj.storageBucket ||
                obj.bucket;
            } else {
              // otherwise treat decoded as the raw private key
              privateKey = decoded;
            }
          } catch {
            // not JSON, treat as raw private key
            privateKey = decoded;
          }
        } else {
          // use FIREBASE_PRIVATE_KEY directly (with escaped newlines)
          privateKey = (process.env.FIREBASE_PRIVATE_KEY as string).replace(
            /\\n/g,
            '\n',
          );
        }

        // ensure PEM formatting looks acceptable; attempt to normalize common mistakes
        const normalizeKey = (k: string) => {
          let s = k.trim();
          // replace CR if present and collapse multiple newlines
          s = s.replace(/\r/g, '').replace(/\n+/g, '\n');
          // if header/footer are present but there are no newlines, insert them
          if (!s.includes('\n') && /-----BEGIN [A-Z ]+-----/.test(s)) {
            s = s.replace(/(-----BEGIN [A-Z ]+-----)\s*/, '$1\n');
            s = s.replace(/\s*(-----END [A-Z ]+-----)/, '\n$1');
          }
          // ensure header/footer on their own line
          s = s.replace(/\s*(-----BEGIN [A-Z ]+-----)\s*/, '$1\n');
          s = s.replace(/\s*(-----END [A-Z ]+-----)\s*/, '\n$1');
          return s;
        };

        try {
          privateKey = normalizeKey(privateKey);
        } catch (e) {
          // ignore normalization errors and proceed, firebase will throw if invalid
        }

        admin.initializeApp({
          credential: admin.credential.cert({
            projectId: process.env.FIREBASE_PROJECT_ID,
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
            privateKey,
          }),
          storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
        });
        this.admin = admin;
        this.bucket = admin.storage().bucket();
        this.configured = true;
        this.logger.log('Firebase Storage initialized');
      } else {
        this.logger.log('Firebase Storage not configured (missing env vars)');
      }
    } catch (err) {
      // give a friendlier hint about credential formats
      const hasKey = !!process.env.FIREBASE_PRIVATE_KEY;
      const hasKeyB64 = !!process.env.FIREBASE_PRIVATE_KEY_B64;
      if (hasKeyB64) {
        this.logger.warn(
          'Firebase admin SDK failed to initialize. FIREBASE_PRIVATE_KEY_B64 is set but parsed value seems invalid. Ensure it is base64 of the service account JSON or the raw private key (base64).',
        );
      } else if (hasKey) {
        this.logger.warn(
          'Firebase admin SDK failed to initialize. FIREBASE_PRIVATE_KEY is set but seems invalid. Ensure you replaced newlines with "\\n" or use FIREBASE_PRIVATE_KEY_B64.',
        );
      } else {
        this.logger.warn(
          'Firebase admin SDK not available or failed to initialize',
        );
      }

      this.logger.debug((err as Error).message);
      this.configured = false;
      this.admin = null;
      this.bucket = null;
    }
  }

  isConfigured() {
    return this.configured && !!this.bucket;
  }

  async uploadBase64(
    dataUrl: string,
    destinationPath: string,
  ): Promise<string> {
    if (!this.isConfigured())
      throw new Error('Firebase Storage not configured');
    // dataUrl format: data:<mime>;base64,<data>
    const match = dataUrl.match(/^data:(.+);base64,(.+)$/);
    if (!match) throw new Error('Imagem em base64 inválida');
    const mime = match[1];
    const base64 = match[2];
    const buffer = Buffer.from(base64, 'base64');
    return this.uploadBuffer(buffer, destinationPath, mime);
  }

  async uploadBuffer(
    buffer: Buffer,
    destinationPath: string,
    mime?: string,
  ): Promise<string> {
    if (!this.isConfigured())
      throw new Error('Firebase Storage not configured');

    // enforce configured maximum upload size (protect against huge base64 payloads)
    if (buffer.length > this.maxUploadBytes) {
      const actualMb = Math.round(buffer.length / 1024 / 1024);
      const limitMb = Math.round(this.maxUploadBytes / 1024 / 1024);
      throw new Error(
        `Arquivo muito grande (${actualMb} MB). Limite: ${limitMb} MB. ` +
          'Considere enviar uma URL pública ou usar upload direto ao storage.',
      );
    }

    const bucket = this.bucket;
    if (!bucket) throw new Error('Firebase Storage not configured');

    const file = bucket.file(destinationPath);
    const metadata: { contentType?: string } = {};
    if (mime) metadata.contentType = mime;

    await file.save(buffer, { metadata: metadata, resumable: false });

    // make file public and return public url
    try {
      await file.makePublic();
      const publicUrl = `https://storage.googleapis.com/${bucket.name}/${destinationPath}`;
      return publicUrl;
    } catch (err) {
      // fallback: generate signed url (valid for long time)
      this.logger.warn(
        'Failed to make file public, generating signed URL',
        err,
      );
      const [url] = await file.getSignedUrl({
        action: 'read',
        expires: '03-01-2500',
      });
      return url;
    }
  }
}
