import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsBoolean, IsEnum, IsNumber, IsOptional, IsString, ValidateNested } from "class-validator";
import { AddOrRemoveAction } from "../enums/cluster.enum";
import { Type } from "class-transformer";

export class ClusterDTO {
    @ApiProperty()
    @IsString()
    name: string;

    @ApiPropertyOptional()
    @IsString()
    @IsOptional()
    description?: string;

}

export class ManageUserClusterOptionDTO {
    @ApiProperty()
    @IsEnum(AddOrRemoveAction)
    action: AddOrRemoveAction;

    @ApiProperty()
    @IsBoolean()
    override: boolean;
}

export class ManageUserClustersDTO {
    @ApiProperty()
    @IsNumber({}, {each: true})
    clusterIds: number[];

    @ApiProperty()
    @ValidateNested()
    @Type(() => ManageUserClusterOptionDTO)
    options: ManageUserClusterOptionDTO;

}