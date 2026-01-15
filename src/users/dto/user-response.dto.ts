import { ApiProperty } from '@nestjs/swagger';

export class UserResponseDto {
  @ApiProperty({ example: 1 })
  id!: number;

  @ApiProperty({ example: 'usuario' })
  login!: string;

  @ApiProperty({ example: 'usuario@exemplo.com' })
  email!: string;

  @ApiProperty({ example: 'Nome Completo' })
  nome!: string;

  @ApiProperty({ example: 'ESTUDANTE' })
  papel!: string;

  @ApiProperty({ example: '2026-01-01T12:00:00.000Z' })
  criadoEm!: string;

  @ApiProperty({ example: '2026-01-01T12:00:00.000Z' })
  atualizadoEm!: string;
}
