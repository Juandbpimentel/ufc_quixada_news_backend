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
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '@/auth/guards/jwt-auth.guard';
import { RolesGuard } from '@/auth/guards/roles.guard';
import { Roles } from '@/auth/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { UsersService } from './users.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { UpdateUserRoleDto } from './dto/update-user-role.dto';
import { AuthenticatedRequest } from '@/auth/types';
import { ForbiddenException } from '@nestjs/common';

@ApiTags('Users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @Get()
  @ApiOperation({ summary: 'Admin: Lista usuários (requer role ADMIN)' })
  findAll() {
    return this.usersService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Autenticado: Obter usuário (owner ou ADMIN)' })
  async findOne(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: AuthenticatedRequest,
  ) {
    if (req.user.id !== id && req.user.role !== Role.ADMIN) {
      throw new ForbiddenException('Sem permissão');
    }
    return await this.usersService.requireById(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Autenticado: Atualizar perfil (owner ou ADMIN)' })
  async updateProfile(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateUserDto,
    @Req() req: AuthenticatedRequest,
  ) {
    if (req.user.id !== id && req.user.role !== Role.ADMIN) {
      throw new ForbiddenException('Sem permissão');
    }
    return await this.usersService.update(id, dto);
  }

  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @Patch(':id/role')
  @ApiOperation({
    summary: 'Admin: Atualizar role do usuário (requer role ADMIN)',
  })
  async setRole(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateUserRoleDto,
  ) {
    return await this.usersService.updateRole(id, dto.role);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Autenticado: Remover usuário (owner ou ADMIN)' })
  async remove(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: AuthenticatedRequest,
  ) {
    if (req.user.id !== id && req.user.role !== Role.ADMIN) {
      throw new ForbiddenException('Sem permissão');
    }
    return await this.usersService.remove(id);
  }
}
