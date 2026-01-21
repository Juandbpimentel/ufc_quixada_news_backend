import {
  Body,
  Controller,
  Get,
  Patch,
  Param,
  ParseIntPipe,
  Post,
  UseGuards,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiTags,
  ApiBody,
  ApiOperation,
  ApiResponse,
  ApiExtraModels,
  getSchemaPath,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '@/auth/guards/jwt-auth.guard';
import { CurrentUser } from '@/auth/decorators/current-user.decorator';
import { Usuario, StatusSolicitacao } from '@prisma/client';
import { CriarSolicitacaoDto } from '../dto/criar-solicitacao.dto';
import { SolicitacoesService } from '../solicitacoes.service';
import { SolicitacaoResponseDto } from '../dto/solicitacao-response.dto';

@ApiTags('Solicitações')
@ApiBearerAuth()
@ApiExtraModels(SolicitacaoResponseDto)
@UseGuards(JwtAuthGuard)
@Controller('solicitacoes')
export class SolicitacoesController {
  constructor(private svc: SolicitacoesService) {}

  // map internal DB enums to client-friendly status values
  private mapStatusToClient(status: string | undefined) {
    if (!status) return status;
    const s = String(status).toUpperCase();
    if (s === 'ACEITA') return 'APROVADA';
    if (s === 'REJEITADA') return 'REJEITADA';
    if (s === 'PENDENTE') return 'PENDENTE';
    return status;
  }

  @Post()
  @ApiOperation({ summary: 'Autenticado: Criar ou reabrir solicitação' })
  @ApiBody({ type: CriarSolicitacaoDto })
  @ApiResponse({
    status: 201,
    description: 'Solicitação criada ou reaberta com sucesso',
    type: SolicitacaoResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Usuário já possui solicitação pendente ou inválida',
  })
  async create(@CurrentUser() user: Usuario, @Body() dto: CriarSolicitacaoDto) {
    // only allow user to request for themselves
    const s = await this.svc.createOrReopenSolicitacao(user.id, dto);
    return {
      ...s,
      status: this.mapStatusToClient(s.status),
      usuarioNome: (s as any).usuario?.nome ?? undefined,
    };
  }

  @Get()
  @ApiOperation({
    summary: 'Autenticado: Listar próprias solicitações (sempre retorna array)',
  })
  @ApiResponse({
    status: 200,
    description: 'Retorna lista de solicitações do próprio usuário (array)',
    type: [SolicitacaoResponseDto],
  })
  async list(@CurrentUser() user: Usuario) {
    // return only the caller's solicitacoes (array). Approvers should use the
    // dedicated /solicitacoes/pending endpoint to list pendings.
    const own = await this.svc.listOwn(user.id);
    return own.map((r) => ({
      ...r,
      status: this.mapStatusToClient(r.status),
      usuarioNome: r.usuario?.nome ?? undefined,
    }));
  }

  @Get('pending')
  @ApiOperation({ summary: 'Aprovadores: listar solicitações pendentes' })
  @ApiResponse({
    status: 200,
    description: 'Retorna lista de solicitações pendentes (array)',
    type: [SolicitacaoResponseDto],
  })
  async listPending(@CurrentUser() user: Usuario) {
    if (
      !(
        user.papel === 'ADMINISTRADOR' ||
        user.isAdmin ||
        user.papel === 'PROFESSOR' ||
        user.papel === 'TECNICO_ADMINISTRATIVO'
      )
    ) {
      // non-approvers should not access this route
      throw new ForbiddenException('Acesso negado');
    }
    const items = await this.svc.listPendingFor();
    return items.map((r) => ({
      ...r,
      status: this.mapStatusToClient(r.status),
      usuarioNome: (r as any).usuario?.nome ?? undefined,
    }));
  }

  @Patch(':id/aceitar')
  @ApiOperation({
    summary:
      'Autenticado: Aceitar solicitação (somente aprovadores permitidos)',
  })
  @ApiResponse({
    status: 200,
    description: 'Solicitação aceita e usuário promovido quando aplicável',
  })
  @ApiResponse({
    status: 403,
    description: 'Acesso negado: usuário não tem permissão para aprovar',
  })
  @ApiResponse({ status: 404, description: 'Solicitação não encontrada' })
  async aceitar(
    @CurrentUser() user: Usuario,
    @Param('id', ParseIntPipe) id: number,
  ) {
    const solic = await this.svc.getById(id);
    if (!solic) throw new NotFoundException('Solicitação não encontrada');

    // permission: BOLSISTA type -> PROFESSOR or TECNICO or admin; PROFESSOR/TECNICO type -> only admin
    if (solic.tipo === 'BOLSISTA') {
      if (
        !(
          user.papel === 'ADMINISTRADOR' ||
          user.isAdmin ||
          user.papel === 'PROFESSOR' ||
          user.papel === 'TECNICO_ADMINISTRATIVO'
        )
      ) {
        throw new ForbiddenException('Acesso negado');
      }
    } else {
      if (!(user.papel === 'ADMINISTRADOR' || user.isAdmin))
        throw new ForbiddenException('Apenas administradores podem aprovar');
    }

    return this.svc.setStatus(id, StatusSolicitacao.ACEITA, user.id);
  }

  @Patch(':id/rejeitar')
  @ApiOperation({
    summary:
      'Autenticado: Rejeitar solicitação (somente aprovadores permitidos)',
  })
  @ApiResponse({ status: 200, description: 'Solicitação rejeitada' })
  @ApiResponse({
    status: 403,
    description: 'Acesso negado: usuário não tem permissão para rejeitar',
  })
  @ApiResponse({ status: 404, description: 'Solicitação não encontrada' })
  async rejeitar(
    @CurrentUser() user: Usuario,
    @Param('id', ParseIntPipe) id: number,
  ) {
    const solic = await this.svc.getById(id);
    if (!solic) throw new NotFoundException('Solicitação não encontrada');

    if (solic.tipo === 'BOLSISTA') {
      if (
        !(
          user.papel === 'ADMINISTRADOR' ||
          user.isAdmin ||
          user.papel === 'PROFESSOR' ||
          user.papel === 'TECNICO_ADMINISTRATIVO'
        )
      ) {
        throw new ForbiddenException('Acesso negado');
      }
    } else {
      if (!(user.papel === 'ADMINISTRADOR' || user.isAdmin))
        throw new ForbiddenException('Apenas administradores podem rejeitar');
    }

    return this.svc.setStatus(id, StatusSolicitacao.REJEITADA, user.id);
  }
}
