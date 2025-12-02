import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsBoolean, IsEnum, IsNumber, IsOptional, ValidateNested } from "class-validator";
import { AddOrRemoveAction } from "../../user/enums/cluster.enum";
import { Type } from "class-transformer";

export class ManageClustersOptionsDTO {
    @ApiProperty()
    @IsEnum(AddOrRemoveAction)
    action: AddOrRemoveAction;

    @ApiProperty()
    @IsBoolean()
    override?: boolean;
}
export class ManageClustersDTO {
    @ApiProperty()
    @IsNumber({}, {each: true})
    clusterIds: number[];

    @ApiProperty()
    @ValidateNested()
    @Type(() => ManageClustersOptionsDTO)
    options: ManageClustersOptionsDTO

}