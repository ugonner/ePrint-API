import { IsEnum, IsOptional, IsString } from "class-validator";
import { DisabilityType, Gender } from "../enums/user.enum";
import { AuthDTO } from "./auth.dto";
import { ApiPropertyOptional } from "@nestjs/swagger";
import { QueryDateDTO } from "./query-request.dto copy";

export class UserProfileDTO extends AuthDTO{
    

    @ApiPropertyOptional()
    @IsString()
    @IsOptional()
    firstName?: string;

    
    @ApiPropertyOptional()
    @IsEnum(DisabilityType)
    @IsOptional()
    disabilityType?:DisabilityType;

    @ApiPropertyOptional()
    @IsString()
    @IsOptional()
    lastName?: string;

    @ApiPropertyOptional()
    @IsString()
    @IsOptional()
    avatar?: string;

    @ApiPropertyOptional()
    @IsEnum(Gender)
    @IsOptional()
    gender?: Gender

}

export class UpdateProfileDTO {
    
    @ApiPropertyOptional()
    @IsString()
    @IsOptional()
    firstName?: string;

    @ApiPropertyOptional()
    @IsString()
    @IsOptional()
    lastName?: string;

    @ApiPropertyOptional()
    @IsString()
    @IsOptional()
    avatar?: string;

    @ApiPropertyOptional()
    @IsEnum(Gender)
    @IsOptional()
    gender?: Gender
}


export class QueryUserDTO extends QueryDateDTO {
    @ApiPropertyOptional()
    @IsString()
    @IsOptional()
    clusterIds: string;
}
