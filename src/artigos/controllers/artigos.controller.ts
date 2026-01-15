import {
  Controller,
  Get,
  Param,
  Query,
  Post,
  UseGuards,
  Body,
  Delete,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiBearerAuth,
  ApiBody,
} from '@nestjs/swagger';
import { ArtigosService } from '../artigos.service';
import { CategoriaArtigo, Usuario } from '@prisma/client';
import { ArticleListDto } from '../dtos/article-list.dto';
import { ArticleResponseDto } from '../dtos/artigo-response.dto';
import { JwtAuthGuard } from '@/auth/guards/jwt-auth.guard';
import { CurrentUser } from '@/auth/decorators/current-user.decorator';
import { AtualizarReacaoDto } from '../dtos/atualizar-reacao.dto';

@ApiTags('Public - Artigos')
@Controller('news')
export class ArtigosController {
  constructor(private readonly artigosService: ArtigosService) {}

  @Get()
  @ApiOperation({
    summary: 'Public: Lista artigos públicos (com paginação por cursor)',
  })
  @ApiResponse({
    status: 200,
    description:
      'Retorna uma coleção de artigos públicos com paginação por cursor ou pagina.',
    type: ArticleListDto,
  })
  @ApiQuery({
    name: 'limite',
    required: false,
    description: 'Número de itens por página (padrão 3, máximo 10)',
  })
  @ApiQuery({
    name: 'cursor',
    required: false,
    description:
      'Cursor (id do último item recebido) — usado para paginação por cursor',
  })
  @ApiQuery({
    name: 'pagina',
    required: false,
    description:
      'Número da página (usado para paginação por página). Use página=1 para a primeira página.',
  })
  @ApiQuery({
    name: 'busca',
    required: false,
    description: 'Termo para busca em título/resumo/conteúdo',
  })
  @ApiQuery({
    name: 'autorId',
    required: false,
    description: 'Filtrar por id do autor',
  })
  @ApiQuery({
    name: 'categoria',
    required: false,
    description:
      'Filtrar por categoria (EVENTOS, OPORTUNIDADES, PESQUISA, PROJETOS, AVISOS, OUTROS)',
  })
  @ApiQuery({
    name: 'dataInicial',
    required: false,
    description:
      'Data inicial (ISO 8601). Filtra por publicadoEm >= dataInicial',
  })
  @ApiQuery({
    name: 'dataFinal',
    required: false,
    description: 'Data final (ISO 8601). Filtra por publicadoEm <= dataFinal',
  })
  list(
    @Query('limite') limite?: string,
    @Query('cursor') cursor?: string,
    @Query('pagina') pagina?: string,
    @Query('busca') busca?: string,
    @Query('autorId') autorId?: string,
    @Query('categoria') categoria?: string,
    @Query('dataInicial') dataInicial?: string,
    @Query('dataFinal') dataFinal?: string,
  ) {
    if (limite && Number(limite) < 1) {
      throw new Error('Limite deve ser maior ou igual a 1');
    }
    if (pagina && Number(pagina) < 1) {
      throw new Error('Página deve ser maior ou igual a 1');
    }
    let dtInicial: Date | undefined;
    let dtFinal: Date | undefined;
    if (dataInicial) {
      dtInicial = new Date(dataInicial);
      if (Number.isNaN(dtInicial.getTime()))
        throw new Error('DataInicial inválida');
    }
    if (dataFinal) {
      dtFinal = new Date(dataFinal);
      if (Number.isNaN(dtFinal.getTime()))
        throw new Error('DataFinal inválida');
    }
    const take = Math.min(Number(limite) || 3, 10);
    const cursorId = cursor ? Number(cursor) : undefined;
    const paginaNum = pagina ? Number(pagina) : undefined;
    const autor = autorId ? Number(autorId) : undefined;
    if (
      categoria &&
      !Object.values(CategoriaArtigo).includes(categoria as CategoriaArtigo)
    ) {
      throw new Error('Categoria inválida');
    }
    const categoriaEnum = categoria
      ? (categoria as CategoriaArtigo)
      : undefined;

    if (typeof paginaNum === 'number') {
      return this.artigosService.listByPage({
        take,
        pagina: paginaNum,
        busca,
        autorId: autor,
        categoria: categoriaEnum,
        dataInicial: dtInicial,
        dataFinal: dtFinal,
        publicado: true,
      });
    }

    return this.artigosService.listByCursor({
      take,
      cursorId,
      busca,
      autorId: autor,
      categoria: categoriaEnum,
      dataInicial: dtInicial,
      dataFinal: dtFinal,
      publicado: true,
    });
  }

  @Get(':slug')
  @ApiOperation({ summary: 'Public: Obter artigo por slug' })
  @ApiResponse({
    status: 200,
    description: 'Retorna o artigo público com sessoes ordenadas',
    type: ArticleResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Artigo não encontrado' })
  getBySlug(@Param('slug') slug: string) {
    return this.artigosService.getPublicBySlug(slug);
  }

  @Get(':slug/preview')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary:
      'Autenticado: Obter pré-visualização de artigo (requer papel adequado)',
  })
  @ApiResponse({
    status: 200,
    description: 'Artigo (mesmo se não publicado)',
    type: ArticleResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Usuário não autenticado' })
  @ApiResponse({ status: 403, description: 'Sem permissão' })
  getPreview(@Param('slug') slug: string, @CurrentUser() user: Usuario) {
    const allowed = [
      'ADMINISTRADOR',
      'BOLSISTA',
      'PROFESSOR',
      'TECNICO_ADMINISTRATIVO',
    ];
    if (!user || !allowed.includes(user.papel)) {
      throw new Error('Sem permissão');
    }
    return this.artigosService.getBySlugForPreview(slug);
  }

  // Reações
  @Get(':id/reacoes')
  @ApiOperation({ summary: 'Public: Obter contagem de reações por tipo' })
  @ApiResponse({
    status: 200,
    description:
      'Retorna um objeto com chaves por tipo de reação e respectivos contadores',
    schema: { example: { CURTIDA: 10, AMEI: 2, TRISTE: 0 } },
  })
  getReactions(@Param('id') id: string) {
    return this.artigosService.getReactionCounts(Number(id));
  }

  @Get(':id/reacao')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Autenticado: Obter reação do usuário para um artigo',
  })
  @ApiResponse({
    status: 200,
    description: 'Tipo de reação do usuário ou null',
  })
  getUserReaction(@Param('id') id: string, @CurrentUser() user: Usuario) {
    // return the whole reaction record for the current user: { id, tipo } or null
    return this.artigosService.getUserReactionRecord(user.id, Number(id));
  }

  @Post(':id/reacoes')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Autenticado: Criar/Atualizar reação em um artigo' })
  @ApiBody({ type: AtualizarReacaoDto })
  @ApiResponse({
    status: 200,
    description: 'Reação criada ou atualizada com sucesso',
  })
  @ApiResponse({ status: 401, description: 'Usuário não autenticado' })
  createReaction(
    @Param('id') id: string,
    @CurrentUser() user: Usuario,
    @Body() dto: AtualizarReacaoDto,
  ) {
    return this.artigosService.createReaction(user.id, Number(id), dto.tipo);
  }

  @Delete(':id/reacoes')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Autenticado: Remover própria reação do artigo' })
  @ApiResponse({
    status: 200,
    description: 'Reação removida com sucesso (ok: true/false)',
  })
  async deleteOwnReaction(
    @Param('id') id: string,
    @CurrentUser() user: Usuario,
  ) {
    return this.artigosService.deleteReactionByUser(user.id, Number(id));
  }

  @Delete(':id/reacoes/:reacaoId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Autenticado: Remover reação (própria ou por admin)',
  })
  @ApiResponse({
    status: 200,
    description:
      'Reação removida com sucesso (por id) ou ok:false se não encontrada',
  })
  @ApiResponse({
    status: 403,
    description:
      'Acesso negado (tentar remover reação de outro usuário sem ser admin)',
  })
  async deleteReaction(
    @Param('id') id: string,
    @Param('reacaoId') reacaoId: string,
    @CurrentUser() user: Usuario,
  ) {
    const reacao = await this.artigosService.getReactionById(Number(reacaoId));
    if (!reacao) return { ok: false };
    if (reacao.usuarioId !== user.id && !user.isAdmin)
      throw new Error('Acesso negado');
    await this.artigosService.deleteReaction(Number(reacaoId));
    return { ok: true };
  }
}
