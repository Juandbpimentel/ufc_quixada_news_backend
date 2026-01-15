import { ApiProperty } from '@nestjs/swagger';
import { ArtigoSessaoDto } from './artigo-sessao.dto';

export class ArticleResponseDto {
  @ApiProperty({ example: 1 })
  id!: number;

  @ApiProperty({ example: 'Título do artigo', description: 'Título do artigo' })
  titulo!: string;

  @ApiProperty({
    example: 'slug-do-artigo',
    description: 'Slug único para URL',
  })
  slug!: string;

  @ApiProperty({
    example: 'Resumo curto',
    description: 'Resumo curto usado na listagem',
    required: false,
  })
  resumo?: string;

  @ApiProperty({ example: 'EVENTOS', description: 'Categoria do artigo' })
  categoria!: string;

  @ApiProperty({
    example: true,
    description: 'Indica se o artigo está publicado',
  })
  publicado!: boolean;

  @ApiProperty({
    example: '2026-01-01T12:00:00.000Z',
    description: 'Data de publicação',
  })
  publicadoEm?: string;

  @ApiProperty({
    description: 'Sessões do artigo (texto / imagem / tópico)',
    type: [ArtigoSessaoDto],
  })
  sessoes!: ArtigoSessaoDto[];

  @ApiProperty({
    description:
      'Contadores de reações por tipo (ex: { CURTIDA: 10, AMEI: 2 })',
    example: { CURTIDA: 10, AMEI: 2 },
    required: false,
  })
  reacoes?: Record<string, number>;
}
