import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { callPurpose, CallType, RoomType } from "../enums/call.enum";
import { PlainRTCSocketMessageType } from "../enums/socket.enum";
import { IsBoolean, IsEnum, IsNumber, IsNumberString, IsOptional, IsString, ValidateNested } from "class-validator";
import { Type } from "class-transformer";
import { QueryRequestDTO } from "./query-request.dto";

 export class IInitUserConnectionDTO {
    socketId?: string;
    peerId?: string;
    userId: string;
    userName?: string;
    avatar?: string;
 }

  export class JoinRoomDTO {
    socketId?: string;
    peerId?: string;
 }


export interface IPlainRTCSocketMessageDTO<TMessageBody> {
    peerSocketId: string;
    messageType: PlainRTCSocketMessageType;
    message: TMessageBody;
    roomId?: string;
}


export class CallMemberDTO {
   @ApiProperty()
   @IsString() 
   userId: string;
   
   @ApiPropertyOptional()
   @IsString()
   @IsOptional() 
   userName?: string;
}

export class CallRoomDTO {
    @ApiProperty()
   @IsString()
   roomId: string;
   
   @ApiProperty()
   @IsEnum(RoomType)
   roomType: RoomType;
   
   @ApiProperty()
   @IsNumber()
   startTime: number;
   
   @ApiProperty()
   @IsNumber()
   endTime: number;
   
   @ApiProperty()
   @Type(() => CallMemberDTO)
   @ValidateNested({each: true})
   callMembers: CallMemberDTO[]
   

   @ApiProperty()
   @IsString()
   initiatedBy: string;
   
   @ApiProperty()
   @IsBoolean()
   answered?: boolean;
   
   @ApiProperty()
   @IsEnum(callPurpose)
   callPurpose: callPurpose;

   @ApiProperty()
   @IsEnum(CallType)
   callType: CallType;

   @ApiProperty()
   @IsNumber()
    aidServiceProfileId: number;
}

export class QueryCallRoomDTO extends QueryRequestDTO {
   @ApiPropertyOptional()
   @IsString()
   @IsOptional()
   userId?: string;

   
     
   @ApiPropertyOptional()
     @IsString()
     @IsOptional()
     aidServiceProfileId?: string;
     
   @ApiPropertyOptional()
     @IsString()
     @IsOptional()
     aidServiceId?: string;

}

