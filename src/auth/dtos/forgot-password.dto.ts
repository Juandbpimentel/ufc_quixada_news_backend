import { IsEmail } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ForgotPasswordDto {
  @ApiProperty({
    description: 'Endereço de e-mail do usuário que solicitou a redefinição',
    example: 'usuario@exemplo.com',
  })
  @IsEmail()
  email!: string;
}
