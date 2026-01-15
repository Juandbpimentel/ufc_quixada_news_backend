import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Request } from 'express';
import { Usuario } from '@prisma/client';

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): Usuario | undefined => {
    const req = ctx.switchToHttp().getRequest<Request & { user?: Usuario }>();
    return req?.user;
  },
);
