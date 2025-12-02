import { ApiProperty } from "@nestjs/swagger";
import { IsBoolean, IsString } from "class-validator";

export class ReportCommentDTO {
    @ApiProperty()
    @IsString()
    comment: string;
}

export class ResolveReportDTO {
    @ApiProperty()
    @IsBoolean()
    isResolved: boolean
}