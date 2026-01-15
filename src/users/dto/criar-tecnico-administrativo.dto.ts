import { IsOptional, IsString } from 'class-validator';

export class CriarTecnicoAdministrativoDto {
  @IsOptional()
  @IsString()
  cargo?: string;
}
