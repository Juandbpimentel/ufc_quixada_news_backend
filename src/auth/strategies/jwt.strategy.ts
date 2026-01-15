import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { UsuariosService } from '@/users/users.service';
import { Request } from 'express';
import { Usuario } from '@prisma/client';

type JwtPayload = Pick<Usuario, 'id' | 'versaoToken'>;

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(private usuariosService: UsuariosService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: process.env.JWT_SECRET || 'secretKey',
      ignoreExpiration: false,
    });
  }

  async validate(payload: JwtPayload): Promise<Usuario> {
    const user = await this.usuariosService.findOne(payload.id);
    if (!user || user.versaoToken !== payload.versaoToken) {
      throw new UnauthorizedException('Sessão inválida ou expirando');
    }
    return user;
  }
}
