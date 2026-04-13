import { IsString, IsNotEmpty, IsInt, IsOptional, IsBoolean, Min, Max, IsEmail } from "class-validator";

export class CreateInboxDto {
  @IsEmail()
  email: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  smtpHost: string;

  @IsInt()
  @Min(1)
  @Max(65535)
  @IsOptional()
  smtpPort?: number;

  @IsString()
  @IsNotEmpty()
  smtpUser: string;

  @IsString()
  @IsNotEmpty()
  smtpPass: string;

  @IsInt()
  @Min(1)
  @Max(1000)
  @IsOptional()
  dailyLimit?: number;

  @IsString()
  @IsOptional()
  domainId?: string;

  @IsBoolean()
  @IsOptional()
  warmupEnabled?: boolean;

  @IsInt()
  @Min(1)
  @IsOptional()
  warmupStartLimit?: number;

  @IsInt()
  @Min(1)
  @IsOptional()
  warmupIncrement?: number;

  @IsInt()
  @Min(1)
  @IsOptional()
  warmupMaxLimit?: number;
}
