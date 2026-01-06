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
import { ApiBearerAuth, ApiTags, ApiOperation } from '@nestjs/swagger';
import { ArticlesService } from '../articles.service';
import { JwtAuthGuard } from '@/auth/guards/jwt-auth.guard';
import { RolesGuard } from '@/auth/guards/roles.guard';
import { Roles } from '@/auth/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { CurrentUser } from '@/auth/decorators/current-user.decorator';
import { User } from '@prisma/client';
import { CreateArticleDto } from '../dtos/create-article.dto';
import { UpdateArticleDto } from '../dtos/update-article.dto';

@ApiTags('Admin - Articles')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
@Controller('admin/news')
export class AdminArticlesController {
  constructor(private readonly articlesService: ArticlesService) {}

  @Get()
  @ApiOperation({ summary: 'Admin: Lista artigos (requer role ADMIN)' })
  listAdmin() {
    return this.articlesService.listAdmin();
  }

  @Post()
  @ApiOperation({ summary: 'Admin: Cria artigo (requer role ADMIN)' })
  create(@CurrentUser() user: User, @Body() dto: CreateArticleDto) {
    return this.articlesService.create(user.id, dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Admin: Atualiza artigo (requer role ADMIN)' })
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateArticleDto) {
    return this.articlesService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Admin: Remove artigo (requer role ADMIN)' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.articlesService.remove(id);
  }
}
