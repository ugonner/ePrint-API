import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional, IsString } from "class-validator";

export class AttachmentDTO {
   
   
    @ApiPropertyOptional()
    @IsString()
    @IsOptional()
    attachmentType?: string;

    @ApiProperty()
    @IsString()
    attachmentUrl: string;
}