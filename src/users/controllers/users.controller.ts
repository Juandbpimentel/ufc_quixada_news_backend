import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '@/auth/guards/jwt-auth.guard';
// import { RolesGuard } from '@/auth/guards/roles.guard';
// import { Roles } from '@/auth/decorators/roles.decorator';
import { Papel } from '@prisma/client';
import { UsuariosService } from '@/users/users.service';
import { AtualizarUsuarioDto } from '@/users/dto/atualizar-usuario.dto';
import { UserResponseDto } from '@/users/dto/user-response.dto';
import { AtualizarPapelUsuarioDto } from '@/users/dto/atualizar-papel-usuario.dto';
import { AuthenticatedRequest } from '@/auth/types';
import { ForbiddenException } from '@nestjs/common';

@ApiTags('Users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('users')
export class UsuariosController {
  constructor(private readonly usuariosService: UsuariosService) {}

  //@UseGuards(RolesGuard)
  //@Roles(Papel.ADMINISTRADOR)
  @Get()
  @ApiOperation({
    summary: 'Admin: Lista usuários (requer papel ADMINISTRADOR)',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de usuários',
    type: [UserResponseDto],
  })
  findAll() {
    return this.usuariosService.findAll();
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Autenticado: Obter usuário (owner ou ADMINISTRADOR)',
  })
  async findOne(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: AuthenticatedRequest,
  ) {
    if (req.user.id !== id && req.user.papel !== Papel.ADMINISTRADOR) {
      throw new ForbiddenException('Sem permissão');
    }
    return await this.usuariosService.requireById(id);
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Autenticado: Atualizar perfil (owner ou ADMINISTRADOR)',
  })
  async updateProfile(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AtualizarUsuarioDto,
    @Req() req: AuthenticatedRequest,
  ) {
    if (req.user.id !== id && req.user.papel !== Papel.ADMINISTRADOR) {
      throw new ForbiddenException('Sem permissão');
    }
    return await this.usuariosService.update(id, dto as any);
  }

  //@UseGuards(RolesGuard)
  //@Roles(Papel.ADMINISTRADOR)
  @Patch(':id/role')
  @ApiOperation({
    summary: 'Admin: Atualizar papel do usuário (requer papel ADMINISTRADOR)',
  })
  async setRole(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AtualizarPapelUsuarioDto,
  ) {
    return await this.usuariosService.updateRole(id, dto.papel);
  }

  @Delete(':id')
  @ApiOperation({
    summary: 'Autenticado: Remover usuário (owner ou ADMINISTRADOR)',
  })
  async remove(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: AuthenticatedRequest,
  ) {
    if (req.user.id !== id && req.user.papel !== Papel.ADMINISTRADOR) {
      throw new ForbiddenException('Sem permissão');
    }
    return await this.usuariosService.remove(id);
  }
}
