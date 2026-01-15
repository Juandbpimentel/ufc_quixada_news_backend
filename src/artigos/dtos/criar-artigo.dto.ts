import { CategoriaArtigo } from '@prisma/client';
import { ApiPropertyOptional, ApiProperty } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEnum,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';

export class CriarArtigoDto {
  @ApiProperty({
    description: 'Título da notícia (mínimo 3 caracteres)',
    example: 'Novo projeto de pesquisa sobre IA',
  })
  @IsString()
  @MinLength(3)
  titulo!: string;

  @ApiPropertyOptional({
    description:
      'Resumo curto da notícia (opcional, máximo sugerido 1000 caracteres)',
    example: 'Resumo introdutório da notícia para listagem',
  })
  @IsOptional()
  @IsString()
  resumo?: string;

  @ApiPropertyOptional({
    description:
      'Slug amigável para URL. Se não informado, será gerado a partir do título',
    example: 'novo-projeto-ia',
  })
  @IsOptional()
  @IsString()
  slug?: string;

  @ApiPropertyOptional({
    description:
      'URL da imagem de capa (pública) — ou use sessões com imagem primária',
    example: 'https://storage.example.com/artigo/capa.jpg',
  })
  @IsOptional()
  @IsString()
  capaUrl?: string;

  @ApiPropertyOptional({
    description:
      'Categoria do artigo (EVENTOS, OPORTUNIDADES, PESQUISA, PROJETOS, AVISOS, OUTROS)',
    enum: CategoriaArtigo,
    example: 'EVENTOS',
  })
  @IsEnum(CategoriaArtigo as object)
  @IsOptional()
  categoria: CategoriaArtigo;

  @ApiPropertyOptional({
    description:
      'Indica se o artigo deverá ser publicado imediatamente (true) ou salvo como rascunho (false)',
    example: false,
  })
  @IsOptional()
  @IsBoolean()
  publicado?: boolean;

  @ApiPropertyOptional({
    description:
      'Sessões do artigo (ordem, tipo (PARAGRAFO|TOPICO|IMAGEM), texto e/ou imagemUrl). Se imagem for data URL, será enviada ao storage.',
    example: [
      { ordem: 0, tipo: 'PARAGRAFO', texto: 'Introdução...' },
      { ordem: 1, tipo: 'IMAGEM', imagemUrl: 'https://...' },
    ],
  })
  @IsOptional()
  // sessões de artigo (ordem, tipo, texto/imagem)
  artigoSessoes?: import('./artigo-sessao.dto').ArtigoSessaoDto[];
}
