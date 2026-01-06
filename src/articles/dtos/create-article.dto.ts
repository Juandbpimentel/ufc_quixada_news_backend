import { IsBoolean, IsOptional, IsString, MinLength } from 'class-validator';

export class CreateArticleDto {
  @IsString()
  @MinLength(3)
  title!: string;

  @IsOptional()
  @IsString()
  summary?: string;

  @IsString()
  @MinLength(10)
  content!: string;

  @IsOptional()
  @IsString()
  coverUrl?: string;

  @IsOptional()
  @IsBoolean()
  published?: boolean;
}
