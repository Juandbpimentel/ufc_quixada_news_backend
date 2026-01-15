import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { UsuariosService } from '@/users/users.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { Usuario } from '@prisma/client';
import { CriarUsuarioDto } from '@/auth/dtos/criar-usuario.dto';
import { LoginRequestDto } from '@/auth/dtos/login-request.dto';
import { SolicitacoesService } from '@/users/solicitacoes.service';

type PublicUser = Omit<Usuario, 'senhaHash'>;

export type AuthResult = {
  token: string;
  user: PublicUser;
};

@Injectable()
export class AuthService {
  constructor(
    private readonly usuariosService: UsuariosService,
    private readonly jwtService: JwtService,
    private readonly solicitacoesService: SolicitacoesService,
  ) {}

  private normalizeEmail(email: string): string {
    return email.trim().toLowerCase();
  }

  private normalizeLogin(login: string): string {
    return login.trim().toLowerCase();
  }

  private signToken(user: Usuario) {
    const payload = {
      id: user.id,
      login: user.login,
      email: user.email,
      nome: user.nome,
      papel: user.papel,
      versaoToken: user.versaoToken,
    };
    return this.jwtService.sign(payload);
  }

  private buildPublicUser(user: Usuario): PublicUser {
    const { senhaHash, ...publicUser } = user;
    void senhaHash;
    return publicUser;
  }

  private buildAuthResult(user: Usuario): AuthResult {
    return {
      token: this.signToken(user),
      user: this.buildPublicUser(user),
    };
  }

  private async findUserWithPassword(login: string): Promise<Usuario | null> {
    const fn = this.usuariosService.findByLogin.bind(this.usuariosService) as (
      login: string,
      opts?: { withPassword?: boolean },
    ) => Promise<Usuario | null>;
    return fn(login, { withPassword: true });
  }

  async validateUser(login: string, password: string): Promise<Usuario | null> {
    const normalizedLogin = this.normalizeLogin(login);
    const user = await this.findUserWithPassword(normalizedLogin);

    if (user && (await bcrypt.compare(password, user.senhaHash))) {
      return user;
    }
    return null;
  }

  async login(dto: LoginRequestDto) {
    const normalizedLogin = this.normalizeLogin(dto.login);
    const validated = await this.validateUser(normalizedLogin, dto.senha);
    if (!validated)
      throw new UnauthorizedException('Usuário ou senha inválidos');
    return this.buildAuthResult(validated);
  }

  loginFromGuard(user: Usuario) {
    return this.buildAuthResult(user);
  }

  async register(dto: CriarUsuarioDto) {
    // validações de sufixo de email conforme perfil
    const emailNorm = this.normalizeEmail(dto.email);
    if (
      (dto.perfil === 'docente' || dto.perfil === 'servidor') &&
      !emailNorm.endsWith('@ufc.br')
    ) {
      throw new BadRequestException(
        'E-mail institucional inválido (deve terminar em @ufc.br)',
      );
    }
    if (dto.perfil === 'bolsista' && !emailNorm.endsWith('@alu.ufc.br')) {
      throw new BadRequestException(
        'E-mail de aluno inválido (deve terminar em @alu.ufc.br)',
      );
    }

    const senhaHash = await bcrypt.hash(dto.senha, 10);
    // cria como VISITANTE (pode logar imediatamente)
    const user = await this.usuariosService.create({
      login: dto.login,
      email: dto.email,
      nome: dto.nome,
      senhaHash,
    });

    // cria solicitação se for bolsista/docente/servidor
    if (dto.perfil === 'bolsista') {
      await this.solicitacoesService.createOrReopenSolicitacao(user.id, {
        tipo: 'BOLSISTA',
      } as any);
    } else if (dto.perfil === 'docente') {
      await this.solicitacoesService.createOrReopenSolicitacao(user.id, {
        tipo: 'PROFESSOR',
      } as any);
    } else if (dto.perfil === 'servidor') {
      await this.solicitacoesService.createOrReopenSolicitacao(user.id, {
        tipo: 'TECNICO',
      } as any);
    }

    return this.buildAuthResult(user);
  }
}
