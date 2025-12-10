import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';

export class RecommendDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  age?: number;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  bodyArea?: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  painType?: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  injuryMechanism?: string;

  @IsOptional()
  @IsBoolean()
  swelling?: boolean;

  @IsOptional()
  @IsBoolean()
  dizziness?: boolean;

  @IsOptional()
  @IsBoolean()
  headHit?: boolean;

  @IsOptional()
  @IsBoolean()
  pelvicPostpartum?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(150)
  sport?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  goal?: string;

  @IsOptional()
  @IsBoolean()
  mentalHealth?: boolean;

  @IsOptional()
  @IsBoolean()
  nutritionInterest?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  urgency?: 'now' | 'soon' | 'flexible' | string;
}
