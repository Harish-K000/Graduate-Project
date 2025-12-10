import { IsOptional, IsString, MaxLength } from 'class-validator';

export class TriageDto {
  @IsString()
  @MaxLength(100)
  bodyArea!: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  painType?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  duration?: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  goals?: string;
}
