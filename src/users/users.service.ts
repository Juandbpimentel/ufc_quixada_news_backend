import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { Usuario, Prisma, Papel } from '@prisma/client';
import { randomUUID } from 'crypto';

@Injectable()
export class UsuariosService {
  constructor(private prisma: PrismaService) {}

  private normalizeEmail(email: string): string {
    return email.trim().toLowerCase();
  }

  private normalizeLogin(login: string): string {
    return login.trim().toLowerCase();
  }

  async create(data: {
    login: string;
    email: string;
    nome: string;
    senhaHash: string;
  }): Promise<Usuario> {
    await this.ensureLoginAvailable(data.login);
    await this.ensureEmailAvailable(data.email);
    const login = this.normalizeLogin(data.login);
    const email = this.normalizeEmail(data.email);
    return await this.prisma.usuario.create({
      data: { ...data, email, login },
    });
  }

  async createWithRoleAndExtension(data: {
    login: string;
    email: string;
    nome: string;
    senhaHash: string;
    papel: Papel;
    bolsista?: { programaBolsista?: string };
    professor?: { departamento?: string };
    tecnicoAdministrativo?: { cargo?: string };
  }): Promise<Usuario> {
    await this.ensureLoginAvailable(data.login);
    await this.ensureEmailAvailable(data.email);
    const login = this.normalizeLogin(data.login);
    const email = this.normalizeEmail(data.email);
    const user = await this.prisma.usuario.create({
      data: {
        login,
        email,
        nome: data.nome,
        senhaHash: data.senhaHash,
        papel: data.papel,
      },
    });

    if (data.papel === Papel.BOLSISTA && data.bolsista) {
      await this.prisma.bolsista.create({
        data: {
          usuarioId: user.id,
          programaBolsista: data.bolsista.programaBolsista,
        },
      });
    }

    if (data.papel === Papel.PROFESSOR && data.professor) {
      await this.prisma.professor.create({
        data: {
          usuarioId: user.id,
        },
      });
    }

    if (
      data.papel === Papel.TECNICO_ADMINISTRATIVO &&
      data.tecnicoAdministrativo
    ) {
      await this.prisma.tecnicoAdministrativo.create({
        data: {
          usuarioId: user.id,
        },
      });
    }

    return user;
  }

  async findAll(): Promise<Usuario[]> {
    return await this.prisma.usuario.findMany({
      orderBy: { id: 'asc' },
    });
  }

  async findOne(id: number): Promise<Usuario | null> {
    return await this.prisma.usuario.findUnique({
      where: { id },
    });
  }

  async findByEmail(
    email: string,
    options: { withPassword: true },
  ): Promise<Usuario>;
  async findByEmail(
    email: string,
    options?: { withPassword?: false },
  ): Promise<Omit<Usuario, 'senhaHash'> | null>;
  async findByEmail(
    email: string,
    options?: { withPassword?: boolean },
  ): Promise<Usuario | Omit<Usuario, 'senhaHash'> | null> {
    const normalizedEmail = this.normalizeEmail(email);
    const user = await this.prisma.usuario.findFirst({
      where: { email: { equals: normalizedEmail, mode: 'insensitive' } },
    });

    if (!user) return null;
    if (options?.withPassword) return user;

    const { senhaHash, ...userWithoutPassword } = user;
    void senhaHash;
    return userWithoutPassword;
  }

  async findByLogin(
    login: string,
    options: { withPassword: true },
  ): Promise<Usuario>;
  async findByLogin(
    login: string,
    options?: { withPassword?: false },
  ): Promise<Omit<Usuario, 'senhaHash'> | null>;
  async findByLogin(
    login: string,
    options?: { withPassword?: boolean },
  ): Promise<Usuario | Omit<Usuario, 'senhaHash'> | null> {
    const normalized = this.normalizeLogin(login);
    const user = await this.prisma.usuario.findFirst({
      where: { login: { equals: normalized, mode: 'insensitive' } },
    });

    if (!user) return null;
    if (options?.withPassword) return user;

    const { senhaHash, ...userWithoutPassword } = user;
    void senhaHash;
    return userWithoutPassword;
  }

  async rotateTokenVersion(id: number): Promise<string> {
    const versaoToken = randomUUID();
    const user = await this.prisma.usuario.update({
      where: { id },
      data: { versaoToken },
      select: { versaoToken: true },
    });
    return user.versaoToken;
  }

  async update(id: number, data: Prisma.UsuarioUpdateInput): Promise<Usuario> {
    if ((data as any).email) {
      await this.ensureEmailAvailable((data as any).email, id);
      (data as any).email = this.normalizeEmail((data as any).email);
    }
    if ((data as any).login) {
      await this.ensureLoginAvailable((data as any).login, id);
      (data as any).login = this.normalizeLogin((data as any).login);
    }
    return await this.prisma.usuario.update({
      where: { id },
      data,
    });
  }

  async updateRole(id: number, papel: Papel): Promise<Usuario> {
    return await this.prisma.usuario.update({
      where: { id },
      data: { papel },
    });
  }

  async remove(id: number): Promise<Usuario> {
    return await this.prisma.usuario.delete({
      where: { id },
    });
  }

  async ensureEmailAvailable(email: string, ignoreUserId?: number) {
    const normalized = this.normalizeEmail(email);
    const existing = await this.prisma.usuario.findFirst({
      where: {
        email: { equals: normalized, mode: 'insensitive' },
        ...(typeof ignoreUserId === 'number'
          ? { NOT: { id: ignoreUserId } }
          : {}),
      },
      select: { id: true },
    });
    if (existing) throw new BadRequestException('O email já está em uso');
  }

  async ensureLoginAvailable(login: string, ignoreUserId?: number) {
    const normalized = this.normalizeLogin(login);
    const existing = await this.prisma.usuario.findFirst({
      where: {
        login: { equals: normalized, mode: 'insensitive' },
        ...(typeof ignoreUserId === 'number'
          ? { NOT: { id: ignoreUserId } }
          : {}),
      },
      select: { id: true },
    });
    if (existing) throw new BadRequestException('O login já está em uso');
  }

  async requireById(id: number): Promise<Usuario> {
    const user = await this.findOne(id);
    if (!user) throw new NotFoundException('Usuário não encontrado');
    return user;
  }
}
