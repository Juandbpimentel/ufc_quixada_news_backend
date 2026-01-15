import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { Papel } from '@prisma/client';
import { ROLES_KEY } from '@/auth/decorators/roles.decorator';

type RequestWithUser = Request & {
  user?: { papel?: Papel };
};

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<Papel[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const req = context.switchToHttp().getRequest<RequestWithUser>();
    const papel = req.user?.papel;
    if (!papel || !requiredRoles.includes(papel)) {
      throw new ForbiddenException('Sem permissão');
    }
    return true;
  }
}
