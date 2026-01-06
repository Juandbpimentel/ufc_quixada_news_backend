import { Controller, Get, Param } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { ArticlesService } from '../articles.service';

@ApiTags('Public - Articles')
@Controller('news')
export class ArticlesController {
  constructor(private readonly articlesService: ArticlesService) {}

  @Get()
  @ApiOperation({ summary: 'Public: Lista artigos públicos' })
  list() {
    return this.articlesService.listPublic();
  }

  @Get(':slug')
  @ApiOperation({ summary: 'Public: Obter artigo por slug' })
  getBySlug(@Param('slug') slug: string) {
    return this.articlesService.getPublicBySlug(slug);
  }
}
