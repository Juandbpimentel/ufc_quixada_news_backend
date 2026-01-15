import { IsOptional, IsString } from 'class-validator';

export class CriarBolsistaDto {
  @IsOptional()
  @IsString()
  programaBolsista?: string;
}
