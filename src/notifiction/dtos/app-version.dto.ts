import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsNumber, IsOptional, IsString } from "class-validator";

export class AppVersionDTO {
    @ApiPropertyOptional()
    @IsString()
    @IsOptional()
    detail?: string;

    @ApiPropertyOptional()
    @IsNumber()
    @IsOptional()
    appVersionId?: number;
  }