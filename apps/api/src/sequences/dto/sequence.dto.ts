import { IsString, IsNotEmpty, IsInt, Min, IsOptional } from "class-validator";

export class CreateSequenceDto {
  @IsInt()
  @Min(1)
  step: number;

  @IsString()
  @IsNotEmpty()
  subject: string;

  @IsString()
  @IsNotEmpty()
  body: string;

  @IsString()
  @IsOptional()
  subjectB?: string;

  @IsString()
  @IsOptional()
  bodyB?: string;

  @IsInt()
  @Min(0)
  @IsOptional()
  delayDays?: number;
}
