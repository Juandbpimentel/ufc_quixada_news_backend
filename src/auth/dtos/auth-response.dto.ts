import { ApiProperty } from '@nestjs/swagger';
import { UserResponseDto } from '@/users/dto/user-response.dto';

export class AuthResponseDto {
  @ApiProperty({ example: 'jwt.token.here' })
  token!: string;

  @ApiProperty({ type: UserResponseDto })
  user!: UserResponseDto;
}
