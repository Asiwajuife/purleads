import { IsString, IsNotEmpty, IsOptional, IsArray, IsEmail } from "class-validator";

export class CreateCampaignDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  fromName?: string;

  @IsEmail()
  @IsOptional()
  replyTo?: string;
}

export class AddLeadsToCampaignDto {
  @IsArray()
  leadIds: string[];
}
