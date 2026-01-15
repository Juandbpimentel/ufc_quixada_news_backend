import { ApiProperty } from '@nestjs/swagger';
import { ArticleResponseDto } from './artigo-response.dto';

export class ArticleListDto {
  @ApiProperty({ type: [ArticleResponseDto] })
  items!: ArticleResponseDto[];

  @ApiProperty({
    description: 'Cursor para próxima página (id do último item)',
    required: false,
  })
  nextCursor?: number | null;

  @ApiProperty({
    description: 'Número da próxima página (quando paginado por página)',
    required: false,
  })
  nextPage?: number | null;
}
