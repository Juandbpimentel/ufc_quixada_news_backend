import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiTags,
  ApiOperation,
  ApiResponse,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '@/auth/guards/jwt-auth.guard';
import { RolesGuard } from '@/auth/guards/roles.guard';
import { Roles } from '@/auth/decorators/roles.decorator';
import { Papel } from '@prisma/client';
import { UsuariosService } from '../users.service';
import { CriarUsuarioAdminDto } from '../dto/criar-usuario-admin.dto';
import { UserResponseDto } from '../dto/user-response.dto';
import * as bcrypt from 'bcrypt';

@ApiTags('Admin - Users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Papel.ADMINISTRADOR)
@Controller('admin/users')
export class AdminUsuariosController {
  constructor(private readonly usuariosService: UsuariosService) {}

  @Post()
  @ApiOperation({
    summary: 'Admin: Criar usuário com papel e dados de extensão (opcional)',
  })
  @ApiResponse({
    status: 201,
    description: 'Usuário criado com sucesso',
    type: UserResponseDto,
  })
  async create(@Body() dto: CriarUsuarioAdminDto) {
    const senhaHash = await bcrypt.hash(dto.senha, 10);
    const user = await this.usuariosService.createWithRoleAndExtension({
      login: dto.login,
      email: dto.email,
      nome: dto.nome,
      senhaHash,
      papel: dto.papel,
      bolsista: dto.bolsista,
      professor: dto.professor,
      tecnicoAdministrativo: dto.tecnicoAdministrativo,
    });
    const { senhaHash: _, ...publicUser } = user;
    return publicUser;
  }
}
