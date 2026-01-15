import { SessaoTipo } from '@prisma/client';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class ArtigoSessaoDto {
  @ApiProperty({
    description: 'Posição da sessão no artigo (ordem)',
    example: 0,
    minimum: 0,
  })
  @IsInt()
  @Min(0)
  ordem!: number;

  @ApiProperty({
    description: 'Tipo da sessão',
    enum: SessaoTipo,
    example: 'PARAGRAFO',
  })
  @IsEnum(SessaoTipo)
  tipo!: SessaoTipo;

  @ApiPropertyOptional({
    description: 'Texto da sessão (opcional)',
    example: 'Parágrafo de texto...',
    maxLength: 2000,
  })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  texto?: string;

  @ApiPropertyOptional({
    description: 'URL da imagem para sessão (pública) ou data URL para upload',
    example: 'data:image/jpeg;base64,... ou https://...',
  })
  @IsOptional()
  @IsString()
  imagemUrl?: string;
}
