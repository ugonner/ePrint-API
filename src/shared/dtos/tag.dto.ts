import { ApiProperty } from "@nestjs/swagger";
import { IsString } from "class-validator";

export class TagDTO {
    @ApiProperty()
    @IsString()
    name: string;
}