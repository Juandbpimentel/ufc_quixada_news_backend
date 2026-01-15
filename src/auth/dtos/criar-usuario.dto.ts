import {
  IsEmail,
  IsNotEmpty,
  IsString,
  IsStrongPassword,
  MinLength,
  IsIn,
} from 'class-validator';

export class CriarUsuarioDto {
  @IsString()
  @IsNotEmpty()
  nome!: string;

  @IsString()
  @IsNotEmpty()
  // login é o identificador principal para autenticação
  login!: string;

  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(6)
  @IsStrongPassword({
    minLength: 6,
    minLowercase: 1,
    minUppercase: 1,
    minNumbers: 1,
    minSymbols: 1,
  })
  senha!: string;

  @IsIn(['estudante', 'docente', 'servidor', 'bolsista'])
  perfil!: 'estudante' | 'docente' | 'servidor' | 'bolsista';
}
