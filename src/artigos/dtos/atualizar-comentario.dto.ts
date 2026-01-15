import { IsOptional, IsString, MinLength, MaxLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class AtualizarComentarioDto {
  @ApiPropertyOptional({
    description:
      'Novo conteúdo do comentário (10–500 caracteres). Deve ser informado pelo proprietário do comentário.',
    example: 'Atualizando meu comentário com informações adicionais...',
    minLength: 10,
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  @MinLength(10)
  @MaxLength(500)
  conteudo?: string;
}
