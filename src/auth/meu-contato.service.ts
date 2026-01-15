import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class MeuContatoService {
  private readonly logger = new Logger(MeuContatoService.name);
  private baseUrl =
    process.env.MEUCONTATO_URL || 'https://meucontato-backend.onrender.com';

  async sendContact(payload: Record<string, any>) {
    try {
      const url = `${this.baseUrl.replace(/\/+$/, '')}/contact`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const text = await res.text();
        this.logger.warn(`MeuContato returned ${res.status}: ${text}`);
        return { ok: false, status: res.status, body: text };
      }
      const json = await res.json().catch(() => null);
      return { ok: true, status: res.status, body: json };
    } catch (err) {
      this.logger.warn(
        'Error sending to MeuContato: ' + (err as Error).message,
      );
      return { ok: false, error: (err as Error).message };
    }
  }
}
