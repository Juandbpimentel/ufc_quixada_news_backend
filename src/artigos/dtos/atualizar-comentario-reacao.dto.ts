import { TipoReacaoComentario } from '@prisma/client';
import { IsEnum } from 'class-validator';

export class AtualizarComentarioReacaoDto {
  @IsEnum(TipoReacaoComentario)
  tipo!: TipoReacaoComentario;
}
