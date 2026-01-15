import { IsString, MinLength } from 'class-validator';

export class LoginRequestDto {
  @IsString()
  @MinLength(1)
  login!: string;

  @IsString()
  @MinLength(6)
  senha!: string;
}
