import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { UsersService } from '@/users/users.service';
import { Request } from 'express';
import { AUTH_COOKIE_NAME } from '@/auth/auth.constants';
import { User } from '@prisma/client';

type JwtPayload = Pick<User, 'id' | 'tokenVersion'>;

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(private usersService: UsersService) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        (req: Request | null): string | null => {
          const token = req?.cookies?.[AUTH_COOKIE_NAME] as unknown;
          return typeof token === 'string' ? token : null;
        },
      ]),
      secretOrKey: process.env.JWT_SECRET || 'secretKey',
      ignoreExpiration: false,
    });
  }

  async validate(payload: JwtPayload): Promise<User> {
    const user = await this.usersService.findOne(payload.id);
    if (!user || user.tokenVersion !== payload.tokenVersion) {
      throw new UnauthorizedException('Sessão inválida ou expirando');
    }
    return user;
  }
}
