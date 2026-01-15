import { IsEnum } from 'class-validator';
import { Papel } from '@prisma/client';

export class AtualizarPapelUsuarioDto {
  @IsEnum(Papel)
  papel!: Papel;
}
