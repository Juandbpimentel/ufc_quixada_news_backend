import { ApiProperty } from '@nestjs/swagger';

export class SolicitacaoResponseDto {
  @ApiProperty({ example: 1 })
  id!: number;

  @ApiProperty({ example: 10, description: 'ID do usuário que solicitou' })
  usuarioId!: number;

  @ApiProperty({ example: 'BOLSISTA', description: 'Tipo da solicitação' })
  tipo!: string;

  @ApiProperty({
    example: 'PENDENTE',
    description: 'Status atual da solicitação',
  })
  status!: string;

  @ApiProperty({
    example: 'Mensagem opcional...',
    description: 'Mensagem anexada à solicitação',
    required: false,
  })
  mensagem?: string;

  @ApiProperty({
    example: '2026-01-01T12:00:00.000Z',
    description: 'Data de criação',
  })
  criadoEm!: string;
}
