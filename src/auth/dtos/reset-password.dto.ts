import { IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ResetPasswordDto {
  @ApiProperty({
    description: 'Token de redefinição recebido por e-mail',
    example: 'a3f5e6c1... (hex string)',
  })
  @IsString()
  token!: string;

  @ApiProperty({
    description:
      'Nova senha (mínimo 6 caracteres, recomenda-se senhas fortes com letras, números e símbolos)',
    example: 'NovaSenha123!',
  })
  @IsString()
  @MinLength(6)
  senha!: string;
}
