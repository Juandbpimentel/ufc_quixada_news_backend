import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
  ApiBody,
} from '@nestjs/swagger';
import { ComentariosService } from '../comentarios.service';
import { CriarComentarioDto } from '../dtos/criar-comentario.dto';
import { ComentarioResponseDto } from '../dtos/comentario-response.dto';
import { AtualizarComentarioDto } from '../dtos/atualizar-comentario.dto';
import { JwtAuthGuard } from '@/auth/guards/jwt-auth.guard';
import { CurrentUser } from '@/auth/decorators/current-user.decorator';
import { Usuario } from '@prisma/client';

@ApiTags('Public - Comentários')
@Controller()
export class ComentariosController {
  constructor(private readonly comentariosService: ComentariosService) {}

  @Get('news/:id/comentarios')
  @ApiOperation({ summary: 'Public: Listar comentários de um artigo' })
  @ApiResponse({
    status: 200,
    type: [ComentarioResponseDto],
    description: 'Lista de comentários (top-level com respostas aninhadas)',
  })
  list(@Param('id', ParseIntPipe) id: number) {
    return this.comentariosService.listByArticle(id);
  }

  @Post('news/:id/comentarios')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Autenticado: Criar comentário em um artigo' })
  @ApiBody({ type: CriarComentarioDto })
  @ApiResponse({
    status: 201,
    type: ComentarioResponseDto,
    description: 'Comentário criado (retorna o comentário criado)',
  })
  @ApiResponse({
    status: 400,
    description: 'Validação do comentário falhou (tamanho ou formato)',
  })
  @ApiResponse({ status: 401, description: 'Usuário não autenticado' })
  create(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: Usuario,
    @Body() dto: CriarComentarioDto,
  ) {
    return this.comentariosService.create(user.id, id, dto);
  }

  @Patch('comentarios/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Autenticado: Atualizar próprio comentário' })
  @ApiBody({ type: AtualizarComentarioDto })
  @ApiResponse({
    status: 200,
    description: 'Comentário atualizado com sucesso',
  })
  @ApiResponse({
    status: 403,
    description: 'Sem permissão para editar este comentário',
  })
  update(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: Usuario,
    @Body() dto: AtualizarComentarioDto,
  ) {
    return this.comentariosService.update(user.id, id, dto, user.isAdmin);
  }

  @Delete('comentarios/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Autenticado: Remover próprio comentário (ou admin)',
  })
  @ApiResponse({ status: 200, description: 'Comentário removido com sucesso' })
  @ApiResponse({
    status: 403,
    description: 'Sem permissão para remover este comentário',
  })
  remove(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: Usuario) {
    return this.comentariosService.remove(user.id, id, user.isAdmin);
  }
}
