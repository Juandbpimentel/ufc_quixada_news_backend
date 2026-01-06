import { Injectable, UnauthorizedException } from '@nestjs/common';
import { UsersService } from '@/users/users.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { User } from '@prisma/client';
import { CreateUserDto } from '@/auth/dtos/create-user.dto';
import { LoginRequestDto } from '@/auth/dtos/login-request.dto';
import { AUTH_COOKIE_NAME } from '@/auth/auth.constants';

type PublicUser = Omit<User, 'passwordHash'>;

export type AuthResult = {
  [AUTH_COOKIE_NAME]: string;
  user: PublicUser;
};

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
  ) {}

  private normalizeEmail(email: string): string {
    return email.trim().toLowerCase();
  }

  private signToken(user: User) {
    const payload = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      tokenVersion: user.tokenVersion,
    };
    return this.jwtService.sign(payload);
  }

  private buildPublicUser(user: User): PublicUser {
    const { passwordHash, ...publicUser } = user;
    void passwordHash;
    return publicUser;
  }

  private buildAuthResult(user: User): AuthResult {
    return {
      [AUTH_COOKIE_NAME]: this.signToken(user),
      user: this.buildPublicUser(user),
    };
  }

  async validateUser(email: string, password: string): Promise<User | null> {
    const normalizedEmail = this.normalizeEmail(email);
    const user = await this.usersService.findByEmail(normalizedEmail, {
      withPassword: true,
    });

    if (user && (await bcrypt.compare(password, user.passwordHash))) {
      return user;
    }
    return null;
  }

  async login(dto: LoginRequestDto) {
    const normalizedEmail = this.normalizeEmail(dto.email);
    const validated = await this.validateUser(normalizedEmail, dto.password);
    if (!validated) throw new UnauthorizedException('Usuário ou senha inválidos');
    return this.buildAuthResult(validated);
  }

  loginFromGuard(user: User) {
    return this.buildAuthResult(user);
  }

  async register(dto: CreateUserDto) {
    const passwordHash = await bcrypt.hash(dto.password, 10);
    const user = await this.usersService.create({
      email: dto.email,
      name: dto.name,
      passwordHash,
    });

    return this.buildAuthResult(user);
  }
}
