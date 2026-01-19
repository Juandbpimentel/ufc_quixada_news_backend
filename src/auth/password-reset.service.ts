import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { randomBytes } from 'crypto';
import * as bcrypt from 'bcrypt';
import { MeuContatoService } from './meu-contato.service';

@Injectable()
export class PasswordResetService {
  private readonly logger = new Logger(PasswordResetService.name);
  constructor(
    private prisma: PrismaService,
    private meuContato: MeuContatoService,
  ) {}

  private generateToken() {
    return randomBytes(32).toString('hex');
  }

  async requestReset(email: string, frontendUrl?: string) {
    const normalized = email.trim().toLowerCase();
    const user = await this.prisma.usuario.findFirst({
      where: { email: { equals: normalized, mode: 'insensitive' } },
    });
    // always respond ok to avoid user enumeration
    if (!user) return { ok: true };

    const token = this.generateToken();
    const expiresAt = new Date(
      Date.now() +
        Number(process.env.PASSWORD_RESET_EXPIRES_MINUTES || '60') * 60 * 1000,
    );

    await this.prisma.passwordResetToken.create({
      data: { usuarioId: user.id, token, expiresAt },
    });

    const resetLinkBase = frontendUrl || process.env.PASSWORD_RESET_URL || '';
    const resetLink =
      resetLinkBase +
      (resetLinkBase.includes('?') ? '&' : '?') +
      `token=${token}`;

    const subject =
      process.env.PASSWORD_RESET_SUBJECT || 'Redefinição de senha';
    const expiresMinutes = Number(
      process.env.PASSWORD_RESET_EXPIRES_MINUTES || '60',
    );
    const expiresFriendly = `${expiresMinutes} minuto${expiresMinutes === 1 ? '' : 's'}`;

    const message = `Olá ${user.nome},\n\nRecebemos uma solicitação para redefinir sua senha. Para redefinir, acesse: ${resetLink}\n\nEste link expira em ${expiresFriendly}. Caso não tenha solicitado, desconsidere esta mensagem.`;

    const messageHtml = `
      <p>Olá <strong>${user.nome}</strong>,</p>
      <p>Recebemos uma solicitação para redefinir sua senha. Para redefinir, clique no botão abaixo:</p>
      <p><a href="${resetLink}" style="display:inline-block;padding:10px 16px;background:#2d6cdf;color:#fff;border-radius:6px;text-decoration:none;">Redefinir senha</a></p>
      <p>Ou acesse este link: <a href="${resetLink}">${resetLink}</a></p>
      <p>Este link expira em <strong>${expiresFriendly}</strong>. Se você não solicitou a redefinição, ignore este e-mail.</p>
      <hr/>
      <p style="font-size:12px;color:#666;">Atenciosamente,<br/>${process.env.MAIL_FROM_NAME || 'UFC Quixadá News'}</p>
    `;

    // build payload for Meu Contato API — send the reset email TO the user
    const payload: Record<string, any> = {
      // 'name' is the sender name shown to the recipient
      name: process.env.MAIL_FROM_NAME || 'UFC Quixadá News',
      // send the message to the user who requested the reset
      email: user.email,
      // explicit from address (avoid relying on 'email' as sender)
      from_email: process.env.MAIL_FROM_EMAIL || 'juandbpimentel@gmail.com',
      subject,
      message,
      // backend expects `message_html` (not `html`)
      message_html: messageHtml,
    };

    // optionally notify an admin address if configured
    if (process.env.MAIL_ADMIN_EMAIL)
      payload.admin_email = process.env.MAIL_ADMIN_EMAIL;

    const sendResult = await this.meuContato.sendContact(payload);
    if (!sendResult.ok) {
      this.logger.warn(
        'Failed to send reset email: ' + JSON.stringify(sendResult),
      );
    }

    return { ok: true };
  }

  async resetPassword(token: string, newPassword: string) {
    const row = await this.prisma.passwordResetToken.findUnique({
      where: { token },
    });
    if (!row) throw new BadRequestException('Token inválido');
    if (row.used) throw new BadRequestException('Token já utilizado');
    if (row.expiresAt.getTime() < Date.now())
      throw new BadRequestException('Token expirado');

    const user = await this.prisma.usuario.findUnique({
      where: { id: row.usuarioId },
    });
    if (!user) throw new BadRequestException('Usuário inválido');

    const senhaHash = await bcrypt.hash(newPassword, 10);
    await this.prisma.usuario.update({
      where: { id: user.id },
      data: { senhaHash },
    });
    await this.prisma.passwordResetToken.update({
      where: { token },
      data: { used: true },
    });

    // rotate token version so existing sessions become invalid
    await this.prisma.usuario.update({
      where: { id: user.id },
      data: { versaoToken: { set: this.generateToken() } },
      select: { versaoToken: true },
    });
    this.logger.log(`Password reset for user ${user.id}`);
    return { ok: true };
  }
}
