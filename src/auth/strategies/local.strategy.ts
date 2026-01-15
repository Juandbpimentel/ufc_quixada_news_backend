import { Strategy } from 'passport-local';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthService } from '@/auth/services/auth.service';
import { Usuario } from '@prisma/client';

@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy) {
  constructor(private authService: AuthService) {
    super({ usernameField: 'login', passwordField: 'senha' });
  }

  async validate(login: string, senha: string): Promise<Usuario> {
    const user = await this.authService.validateUser(login, senha);
    if (!user) {
      throw new UnauthorizedException('Credenciais inválidas');
    }
    return user;
  }
}
