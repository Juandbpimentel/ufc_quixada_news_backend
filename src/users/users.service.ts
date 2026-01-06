import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { User, Prisma, Role } from '@prisma/client';
import { randomUUID } from 'crypto';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  private normalizeEmail(email: string): string {
    return email.trim().toLowerCase();
  }

  async create(data: {
    email: string;
    name: string;
    passwordHash: string;
  }): Promise<User> {
    const email = this.normalizeEmail(data.email);
    return await this.prisma.user.create({
      data: { ...data, email },
    });
  }

  async findAll(): Promise<User[]> {
    return await this.prisma.user.findMany({
      orderBy: { id: 'asc' },
    });
  }

  async findOne(id: number): Promise<User | null> {
    return await this.prisma.user.findUnique({
      where: { id },
    });
  }

  async findByEmail(
    email: string,
    options: { withPassword: true },
  ): Promise<User>;
  async findByEmail(
    email: string,
    options?: { withPassword?: false },
  ): Promise<Omit<User, 'passwordHash'> | null>;
  async findByEmail(
    email: string,
    options?: { withPassword?: boolean },
  ): Promise<User | Omit<User, 'passwordHash'> | null> {
    const normalizedEmail = this.normalizeEmail(email);
    const user = await this.prisma.user.findFirst({
      where: { email: { equals: normalizedEmail, mode: 'insensitive' } },
    });

    if (!user) return null;
    if (options?.withPassword) return user;

    const { passwordHash, ...userWithoutPassword } = user;
    void passwordHash;
    return userWithoutPassword;
  }

  async rotateTokenVersion(id: number): Promise<string> {
    const tokenVersion = randomUUID();
    const user = await this.prisma.user.update({
      where: { id },
      data: { tokenVersion },
      select: { tokenVersion: true },
    });
    return user.tokenVersion;
  }

  async update(id: number, data: Prisma.UserUpdateInput): Promise<User> {
    return await this.prisma.user.update({
      where: { id },
      data,
    });
  }

  async updateRole(id: number, role: Role): Promise<User> {
    return await this.prisma.user.update({
      where: { id },
      data: { role },
    });
  }

  async remove(id: number): Promise<User> {
    return await this.prisma.user.delete({
      where: { id },
    });
  }

  async ensureEmailAvailable(email: string, ignoreUserId?: number) {
    const normalized = this.normalizeEmail(email);
    const existing = await this.prisma.user.findFirst({
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

  async requireById(id: number): Promise<User> {
    const user = await this.findOne(id);
    if (!user) throw new NotFoundException('Usuário não encontrado');
    return user;
  }
}
