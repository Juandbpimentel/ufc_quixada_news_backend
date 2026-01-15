import { TipoReacao } from '@prisma/client';
import { IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AtualizarReacaoDto {
  @ApiProperty({
    description: 'Tipo da reação',
    enum: TipoReacao,
    example: 'CURTIDA',
  })
  @IsEnum(TipoReacao)
  tipo!: TipoReacao;
}
