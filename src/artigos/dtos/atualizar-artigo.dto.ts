import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEnum,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';
import { CategoriaArtigo } from '@prisma/client';
import { ArtigoSessaoDto } from './artigo-sessao.dto';

export class AtualizarArtigoDto {
  @ApiPropertyOptional({
    description: 'Título da notícia (mínimo 3 caracteres)',
    example: 'Título atualizado',
  })
  @IsOptional()
  @IsString()
  @MinLength(3)
  titulo?: string;

  @ApiPropertyOptional({
    description: 'Resumo curto da notícia (opcional)',
    example: 'Resumo atualizado',
  })
  @IsOptional()
  @IsString()
  resumo?: string;

  @ApiPropertyOptional({
    description: 'Conteúdo completo da notícia (texto)',
    example: 'Conteúdo atualizado',
  })
  @IsOptional()
  @IsString()
  @MinLength(10)
  conteudo?: string;

  @ApiPropertyOptional({
    description: 'URL da imagem de capa (pública)',
    example: 'https://storage.example.com/artigo/capa-atualizada.jpg',
  })
  @IsOptional()
  @IsString()
  capaUrl?: string;

  @ApiPropertyOptional({
    description: 'Categoria do artigo',
    enum: CategoriaArtigo,
    example: 'EVENTOS',
  })
  @IsOptional()
  @IsEnum(CategoriaArtigo as object)
  categoria?: CategoriaArtigo;

  @ApiPropertyOptional({
    description: 'Indica se o artigo deverá ser publicado imediatamente',
    example: false,
  })
  @IsOptional()
  @IsBoolean()
  publicado?: boolean;

  @ApiPropertyOptional({
    description:
      'Sessões do artigo (ordem, tipo, texto/imagem). Se imagem for data URL, será enviada ao storage.',
    example: [{ ordem: 0, tipo: 'PARAGRAFO', texto: 'Texto atualizado' }],
  })
  @IsOptional()
  artigoSessoes?: ArtigoSessaoDto[];
}
