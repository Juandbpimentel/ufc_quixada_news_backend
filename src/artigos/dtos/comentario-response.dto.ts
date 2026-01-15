import { ApiProperty } from '@nestjs/swagger';

export class AutorDto {
  @ApiProperty({ description: 'ID do autor', example: 2 })
  id!: number;

  @ApiProperty({ description: 'Nome do autor', example: 'Fulano' })
  nome!: string;

  @ApiProperty({ description: 'Login do autor', example: 'fulano' })
  login!: string;
}

export class ComentarioResponseDto {
  @ApiProperty({ description: 'ID do comentário', example: 1 })
  id!: number;

  @ApiProperty({
    description: 'Conteúdo do comentário',
    example: 'Ótima notícia!',
  })
  conteudo!: string;

  @ApiProperty({ description: 'Autor do comentário', type: AutorDto })
  autor!: AutorDto;

  @ApiProperty({
    description: 'ID do comentário pai (quando for resposta)',
    required: false,
    example: 5,
  })
  comentarioPaiId?: number;

  @ApiProperty({
    description: 'Respostas (comentários filhos), aninhadas',
    type: [ComentarioResponseDto],
    required: false,
  })
  respostas?: ComentarioResponseDto[];
}
