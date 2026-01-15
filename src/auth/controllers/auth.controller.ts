import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import {
  ApiOperation,
  ApiBearerAuth,
  ApiBody,
  ApiResponse,
} from '@nestjs/swagger';
import { Response, Request } from 'express';
import { AuthService } from '@/auth/services/auth.service';
import { LocalAuthGuard } from '@/auth/guards/local-auth.guard';
import { JwtAuthGuard } from '@/auth/guards/jwt-auth.guard';
import { PasswordResetService } from '@/auth/password-reset.service';
import { CriarUsuarioDto } from '@/auth/dtos/criar-usuario.dto';
import { UsuariosService } from '@/users/users.service';
import { AuthResponseDto } from '@/auth/dtos/auth-response.dto';
import { LoginRequestDto } from '@/auth/dtos/login-request.dto';
import { AuthenticatedRequest } from '@/auth/types';
import { ForgotPasswordDto } from '@/auth/dtos/forgot-password.dto';
import { ResetPasswordDto } from '@/auth/dtos/reset-password.dto';

@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private passwordResetService: PasswordResetService,
    private usuariosService: UsuariosService,
  ) {}

  private getOriginFromReq(req?: Request): string | undefined {
    if (!req) return undefined;
    if (typeof req.get === 'function') return req.get('origin');
    const h = req.headers as Record<string, any> | undefined;
    if (!h) return undefined;
    return (h.origin as string) || (h['origin'] as string) || undefined;
  }

  @UseGuards(LocalAuthGuard)
  @Post('login')
  @ApiOperation({
    summary: 'Public: Login (retorna token JWT e dados do usuário)',
  })
  @ApiBody({ type: LoginRequestDto })
  @ApiResponse({
    status: 200,
    description: 'Login realizado com sucesso (retorna token JWT e user)',
    type: AuthResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Usuário ou senha inválidos' })
  login(@Body() _body: LoginRequestDto, @Req() req: AuthenticatedRequest) {
    const authResult = this.authService.loginFromGuard(req.user);
    const { token, user } = authResult;
    return { message: 'Login realizado com sucesso', token, user };
  }

  @UseGuards(JwtAuthGuard)
  @Post('logout')
  @ApiOperation({ summary: 'Autenticado: Logout (invalida o token atual)' })
  @ApiResponse({
    status: 200,
    description: 'Logout realizado com sucesso',
    schema: { example: { message: 'Logout realizado com sucesso' } },
  })
  async logout(@Req() req: AuthenticatedRequest) {
    // invalidate token by rotating versaoToken
    await this.usuariosService.rotateTokenVersion(req.user.id);
    return { message: 'Logout realizado com sucesso' };
  }

  @Post('register')
  @ApiOperation({
    summary:
      'Public: Registrar novo usuário (retorna token JWT e dados do usuário)',
  })
  @ApiBody({ type: CriarUsuarioDto })
  @ApiResponse({
    status: 200,
    description: 'Usuário registrado com sucesso (retorna token JWT e user)',
    type: AuthResponseDto,
  })
  @ApiResponse({
    status: 400,
    description:
      'Dados inválidos (email/login em uso ou sufixo de email inválido para o perfil)',
  })
  async register(@Body() body: CriarUsuarioDto) {
    const authResult = await this.authService.register(body);
    const { token, user } = authResult;
    return { message: 'Usuário registrado com sucesso', token, user };
  }

  @Post('forgot-password')
  @ApiOperation({
    summary: 'Public: Solicitar redefinição de senha (envia e-mail)',
  })
  @ApiBody({ type: ForgotPasswordDto })
  @ApiResponse({
    status: 200,
    description:
      'Solicitação aceita (resposta genérica para evitar enumeração de usuários)',
    schema: { example: { ok: true } },
  })
  @ApiResponse({ status: 400, description: 'Email inválido' })
  async forgotPassword(@Body() body: ForgotPasswordDto) {
    await this.passwordResetService.requestReset(body.email);
    return { ok: true };
  }

  @Post('reset-password')
  @ApiOperation({ summary: 'Public: Redefinir senha usando token' })
  @ApiBody({ type: ResetPasswordDto })
  @ApiResponse({
    status: 200,
    description: 'Senha redefinida com sucesso',
    schema: { example: { ok: true } },
  })
  @ApiResponse({
    status: 400,
    description: 'Token inválido, expirado ou já utilizado',
  })
  async resetPassword(@Body() body: ResetPasswordDto) {
    await this.passwordResetService.resetPassword(body.token, body.senha);
    return { ok: true };
  }

  @UseGuards(JwtAuthGuard)
  @Get('profile')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Autenticado: Obter perfil do usuário' })
  @ApiResponse({
    status: 200,
    description: 'Perfil do usuário',
    schema: {
      example: {
        id: 1,
        login: 'usuario',
        email: 'x@x',
        nome: 'Nome',
        papel: 'ESTUDANTE',
      },
    },
  })
  getProfile(@Req() req: AuthenticatedRequest) {
    return {
      id: req.user.id,
      login: req.user.login,
      email: req.user.email,
      nome: req.user.nome,
      papel: req.user.papel,
      criadoEm: req.user.criadoEm,
      atualizadoEm: req.user.atualizadoEm,
    };
  }
}
