import { IsOptional, IsString, MinLength } from 'class-validator';

export class AtualizarUsuarioDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  nome?: string;

  @IsOptional()
  @IsString()
  @MinLength(3)
  login?: string;

  @IsOptional()
  @IsString()
  email?: string;
}
