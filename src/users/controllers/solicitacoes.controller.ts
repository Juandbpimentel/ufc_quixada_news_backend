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
    return this.svc.createOrReopenSolicitacao(user.id, dto);
  }

  @Get()
  @ApiOperation({
    summary:
      'Autenticado: Listar próprias solicitações ou as pendentes para aprovar (se aprovar) ',
  })
  @ApiResponse({
    status: 200,
    description:
      'Retorna lista de solicitações (próprias ou pendentes para aprovador)',
    schema: {
      oneOf: [
        { $ref: getSchemaPath(SolicitacaoResponseDto) },
        {
          type: 'array',
          items: { $ref: getSchemaPath(SolicitacaoResponseDto) },
        },
      ],
    },
  })
  async list(@CurrentUser() user: Usuario) {
    // if admin or professor/tecnico return pendings
    if (
      user.isAdmin ||
      user.papel === 'PROFESSOR' ||
      user.papel === 'TECNICO_ADMINISTRATIVO'
    ) {
      return this.svc.listPendingFor();
    }
    // otherwise return own
    return this.svc.listOwn(user.id);
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
          user.isAdmin ||
          user.papel === 'PROFESSOR' ||
          user.papel === 'TECNICO_ADMINISTRATIVO'
        )
      ) {
        throw new ForbiddenException('Acesso negado');
      }
    } else {
      if (!user.isAdmin)
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
          user.isAdmin ||
          user.papel === 'PROFESSOR' ||
          user.papel === 'TECNICO_ADMINISTRATIVO'
        )
      ) {
        throw new ForbiddenException('Acesso negado');
      }
    } else {
      if (!user.isAdmin)
        throw new ForbiddenException('Apenas administradores podem rejeitar');
    }

    return this.svc.setStatus(id, StatusSolicitacao.REJEITADA, user.id);
  }
}
