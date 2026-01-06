import {
  Body,
  Controller,
  Get,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiCookieAuth,
} from '@nestjs/swagger';
import { Response, Request } from 'express';
import { AuthService } from '@/auth/services/auth.service';
import { LocalAuthGuard } from '@/auth/guards/local-auth.guard';
import { JwtAuthGuard } from '@/auth/guards/jwt-auth.guard';
import { AUTH_COOKIE_NAME } from '@/auth/auth.constants';
import { CreateUserDto } from '@/auth/dtos/create-user.dto';
import { LoginRequestDto } from '@/auth/dtos/login-request.dto';
import { AuthenticatedRequest } from '@/auth/types';

type CookieCapableResponse = Response & {
  cookie?: (name: string, val: string, options?: any) => void;
  clearCookie?: (name: string, options?: any) => void;
};

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  private getOriginFromReq(req?: Request): string | undefined {
    if (!req) return undefined;
    if (typeof req.get === 'function') return req.get('origin');
    const h = req.headers as Record<string, any> | undefined;
    if (!h) return undefined;
    return (h.origin as string) || (h['origin'] as string) || undefined;
  }

  private setCookie(res: Response, token: string, origin?: string) {
    const isCrossSite =
      typeof origin === 'string' && !origin.includes('localhost');
    const cookieOptions = {
      httpOnly: true,
      secure: isCrossSite,
      sameSite: isCrossSite ? ('none' as const) : ('lax' as const),
      expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    };

    const cookieRes = res as CookieCapableResponse;
    if (cookieRes && typeof cookieRes.cookie === 'function') {
      cookieRes.cookie(AUTH_COOKIE_NAME, token, cookieOptions);
    }
  }

  @UseGuards(LocalAuthGuard)
  @Post('login')
  @ApiOperation({ summary: 'Public: Login (retorna cookie de autenticação)' })
  login(
    @Body() _body: LoginRequestDto,
    @Req() req: AuthenticatedRequest,
    @Res({ passthrough: true }) res: Response,
  ) {
    const authResult = this.authService.loginFromGuard(req.user);
    const token = authResult[AUTH_COOKIE_NAME] as string;
    const origin = this.getOriginFromReq(req);
    this.setCookie(res, token, origin);
    return { message: 'Login realizado com sucesso', ...authResult };
  }

  @Post('logout')
  @ApiOperation({ summary: 'Public: Logout (limpa cookie de autenticação)' })
  logout(
    @Req() reqOrRes: Request | Response,
    @Res({ passthrough: true }) res?: Response,
  ) {
    const actualRes: Response | undefined =
      res ?? (reqOrRes as unknown as Response);
    const actualReq: Request | undefined = res
      ? (reqOrRes as Request)
      : undefined;

    const origin = this.getOriginFromReq(actualReq);
    const isCrossSite =
      typeof origin === 'string' && !origin.includes('localhost');
    const clearableRes = actualRes as CookieCapableResponse;
    if (clearableRes && typeof clearableRes.clearCookie === 'function') {
      if (!actualReq) {
        clearableRes.clearCookie(AUTH_COOKIE_NAME);
      } else {
        clearableRes.clearCookie(AUTH_COOKIE_NAME, {
          httpOnly: true,
          secure: isCrossSite,
          sameSite: isCrossSite ? ('none' as const) : ('lax' as const),
        });
      }
    }
    return { message: 'Logout realizado com sucesso' };
  }

  @Post('register')
  @ApiOperation({
    summary: 'Public: Registrar novo usuário (retorna cookie de autenticação)',
  })
  async register(
    @Body() body: CreateUserDto,
    @Req() reqOrRes: Request | Response,
    @Res({ passthrough: true }) res?: Response,
  ) {
    const actualRes: Response | undefined =
      res ?? (reqOrRes as unknown as Response);
    const actualReq: Request | undefined = res
      ? (reqOrRes as Request)
      : undefined;

    const authResult = await this.authService.register(body);
    const token = authResult[AUTH_COOKIE_NAME] as string;
    const origin = this.getOriginFromReq(actualReq);

    if (actualRes) {
      const cookieRes = actualRes as CookieCapableResponse;
      if (typeof cookieRes.cookie === 'function') {
        cookieRes.cookie(AUTH_COOKIE_NAME, token, {
          httpOnly: true,
          secure: typeof origin === 'string' && !origin.includes('localhost'),
          sameSite:
            typeof origin === 'string' && !origin.includes('localhost')
              ? ('none' as const)
              : ('lax' as const),
          expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        });
      }
    }

    return { message: 'Usuário registrado com sucesso', ...authResult };
  }

  @UseGuards(JwtAuthGuard)
  @Get('profile')
  @ApiBearerAuth()
  @ApiCookieAuth()
  @ApiOperation({ summary: 'Autenticado: Obter perfil do usuário' })
  getProfile(@Req() req: AuthenticatedRequest) {
    return {
      id: req.user.id,
      email: req.user.email,
      name: req.user.name,
      role: req.user.role,
      createdAt: req.user.createdAt,
      updatedAt: req.user.updatedAt,
    };
  }
}
