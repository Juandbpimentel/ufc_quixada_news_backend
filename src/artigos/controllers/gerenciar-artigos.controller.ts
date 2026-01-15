import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiTags,
  ApiOperation,
  ApiQuery,
  ApiBody,
  ApiResponse,
} from '@nestjs/swagger';
import { ArtigosService } from '../artigos.service';
import { JwtAuthGuard } from '@/auth/guards/jwt-auth.guard';
import { RolesGuard } from '@/auth/guards/roles.guard';
import { Roles } from '@/auth/decorators/roles.decorator';
import { Papel } from '@prisma/client';
import { CurrentUser } from '@/auth/decorators/current-user.decorator';
import { Usuario } from '@prisma/client';
import { CriarArtigoDto } from '../dtos/criar-artigo.dto';
import { AtualizarArtigoDto } from '../dtos/atualizar-artigo.dto';
import { ArticleResponseDto } from '../dtos/artigo-response.dto';
import { ArticleListDto } from '../dtos/article-list.dto';
import { CategoriaArtigo } from '@prisma/client';

@ApiTags('Gerenciar - Artigos')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(
  Papel.ADMINISTRADOR,
  Papel.BOLSISTA,
  Papel.PROFESSOR,
  Papel.TECNICO_ADMINISTRATIVO,
)
@Controller('gerenciar/artigos')
export class GerenciarArtigosController {
  constructor(private readonly artigosService: ArtigosService) {}

  @Get()
  @ApiOperation({
    summary:
      'Gerenciar: Lista todos os artigos do sistema (com paginação por cursor)',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de artigos',
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
        publicado: undefined,
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
      publicado: undefined,
    });
  }

  @Post()
  @ApiOperation({
    summary: 'Gerenciar: Criar artigo (requer papel apropriado)',
  })
  @ApiBody({ type: CriarArtigoDto })
  @ApiResponse({
    status: 201,
    description: 'Artigo criado com sucesso',
    type: ArticleResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Dados inválidos para criação' })
  @ApiResponse({ status: 401, description: 'Usuário não autenticado' })
  @ApiResponse({
    status: 403,
    description: 'Sem permissão: papel insuficiente',
  })
  create(@CurrentUser() user: Usuario, @Body() dto: CriarArtigoDto) {
    return this.artigosService.create(user.id, dto);
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Gerenciar: Atualiza artigo (requer papel apropriado)',
  })
  @ApiBody({
    type: AtualizarArtigoDto,
    schema: {
      example: {
        titulo: 'Título atualizado do artigo',
        resumo: 'Resumo atualizado',
        conteudo: 'Conteúdo atualizado',
        publicado: true,
        categoria: 'EVENTOS',
        artigoSessoes: [
          { ordem: 0, tipo: 'PARAGRAFO', texto: 'Texto atualizado' },
        ],
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Artigo atualizado com sucesso',
    type: ArticleResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Artigo não encontrado' })
  @ApiResponse({ status: 401, description: 'Usuário não autenticado' })
  @ApiResponse({
    status: 403,
    description: 'Sem permissão: papel insuficiente',
  })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AtualizarArtigoDto,
  ) {
    return this.artigosService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({
    summary: 'Gerenciar: Remove artigo (requer papel apropriado)',
  })
  @ApiResponse({ status: 200, description: 'Artigo removido com sucesso' })
  @ApiResponse({ status: 404, description: 'Artigo não encontrado' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.artigosService.remove(id);
  }
}
