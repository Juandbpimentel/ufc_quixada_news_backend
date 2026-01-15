import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { Papel } from '@prisma/client';
import { CriarBolsistaDto } from './criar-bolsista.dto';
import { CriarProfessorDto } from './criar-professor.dto';
import { CriarTecnicoAdministrativoDto } from './criar-tecnico-administrativo.dto';

export class CriarUsuarioAdminDto {
  @IsString()
  @IsNotEmpty()
  nome!: string;

  @IsString()
  @IsNotEmpty()
  login!: string;

  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(6)
  senha!: string;

  @IsEnum(Papel)
  papel!: Papel;

  @IsOptional()
  @ValidateNested()
  @Type(() => CriarBolsistaDto)
  bolsista?: CriarBolsistaDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => CriarProfessorDto)
  professor?: CriarProfessorDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => CriarTecnicoAdministrativoDto)
  tecnicoAdministrativo?: CriarTecnicoAdministrativoDto;
}
