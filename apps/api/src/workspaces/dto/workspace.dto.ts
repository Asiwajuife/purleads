import { IsString, IsNotEmpty, MinLength } from "class-validator";

export class CreateWorkspaceDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  name: string;
}
