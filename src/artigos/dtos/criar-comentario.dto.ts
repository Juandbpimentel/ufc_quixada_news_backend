import {
  IsInt,
  IsOptional,
  IsString,
  MinLength,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CriarComentarioDto {
  @ApiProperty({
    description: 'Conteúdo do comentário (texto), entre 10 e 500 caracteres',
    example: 'Ótima notícia! Gostaria de saber mais sobre o evento...',
    minLength: 10,
    maxLength: 500,
  })
  @IsString()
  @MinLength(10)
  @MaxLength(500)
  conteudo!: string;

  @ApiPropertyOptional({
    description: 'ID do comentário pai caso seja uma resposta (opcional)',
    example: 12,
  })
  @IsOptional()
  @IsInt()
  comentarioPaiId?: number;
}
