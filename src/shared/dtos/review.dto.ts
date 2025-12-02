import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsBoolean, IsEnum, isNumber, IsNumber, IsOptional, IsString } from "class-validator";
import { ServiceType } from "../enums/review";
import { QueryDateDTO } from "./query-request.dto copy";

export class ReviewAndRatingDTO {
    id: number;

    @ApiPropertyOptional()
    @IsNumber()
    @IsOptional()
    rating?: number;

    @ApiPropertyOptional()
    @IsString()
    @IsOptional()
    review?: string;

    @ApiPropertyOptional()
    @IsEnum(ServiceType)
    @IsOptional()
    serviceType: ServiceType;

    @ApiPropertyOptional()
    @IsNumber()
    @IsOptional()
    serviceTypeEntityId?: number;

    
}

export class QueryReviewAndReportDTO extends QueryDateDTO {
    @ApiProperty()
    @IsEnum(ServiceType)
    serviceType: ServiceType;
}

export class UpdateReportDTO {
    @ApiProperty()
    @IsNumber()
    reportId: number;

    @ApiPropertyOptional()
    @IsString()
    @IsOptional()
    comment?: string;

    @ApiPropertyOptional()
    @IsBoolean()
    @IsOptional()
    resolved?: boolean;
}