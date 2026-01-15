import { IsOptional, IsString } from 'class-validator';

export class CriarProfessorDto {
  @IsOptional()
  @IsString()
  departamento?: string;
}
