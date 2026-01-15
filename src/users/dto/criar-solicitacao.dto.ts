import { IsEnum, IsOptional, IsString } from 'class-validator';
import { SolicitacaoTipo } from '@prisma/client';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CriarSolicitacaoDto {
  @ApiProperty({
    description: 'Tipo de solicitação desejada',
    enum: SolicitacaoTipo,
    example: 'BOLSISTA',
  })
  @IsEnum(SolicitacaoTipo)
  tipo!: SolicitacaoTipo;

  @ApiPropertyOptional({
    description: 'Mensagem opcional explicando a solicitação',
    example: 'Sou aluno do curso X e gostaria de me candidatar.',
  })
  @IsOptional()
  @IsString()
  mensagem?: string;
}
