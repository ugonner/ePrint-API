import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsBooleanString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  IsUrl,
  ValidateNested,
} from 'class-validator';
import { ILocationAddressDTO } from '../../aid-service/dtos/aid-service.dto';
import { QueryDateDTO } from '../../shared/dtos/query-request.dto copy';
import { BookingStatus, BookingUpdateBookingStatus, DeliveryType } from '../enums/booking.enum';
import { AttachmentDTO } from '../../file-upload/dtos/file.dto';


export class BookingMediaFileDTO extends AttachmentDTO {
  @ApiProperty()
  @IsNumber()
  copies: number;
}

export class BookingDTO {
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  bookingNote?: string;

  @ApiPropertyOptional()
  @ValidateNested()
  @Type(() => ILocationAddressDTO)
  @IsOptional()
  locationAddress?: ILocationAddressDTO;

  @ApiProperty()
  @IsString()
  startDate: string;

  
  @ApiPropertyOptional()
  @ValidateNested()
  @Type(() => AttachmentDTO)
  @IsOptional()  
  descriptionMedia?: AttachmentDTO;
  
    @ApiProperty()
    @ValidateNested({each: true})
    @Type(() => BookingMediaFileDTO)
    rawMediaFiles?: BookingMediaFileDTO[];

    @ApiProperty()
    @IsString()
    @IsOptional()
    contactPhoneNumber: string;

    @ApiPropertyOptional()
    @IsEnum(DeliveryType)
    @IsOptional()
    deliveryType: DeliveryType
  
    


}

export class CreateBookingDTO extends BookingDTO {
  
  @ApiProperty()
  @IsNumber()
  aidServiceId: number;

  @ApiPropertyOptional()
  @IsNumber()
  @IsOptional()
  aidServiceProfileId?: number;
}

export class UpdateBookingProcessedMediaFilesDTO {
  @ApiProperty()
  @ValidateNested({each: true})
  @Type(() => BookingMediaFileDTO)
  processedMediaFiles?: BookingMediaFileDTO[];
}

export class QueryBookingDTO extends QueryDateDTO {
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  userId: string;

  @ApiPropertyOptional()
  @IsEnum(BookingStatus)
  @IsOptional()
  bookingStatus?: BookingStatus;

  @ApiPropertyOptional()
  @IsBooleanString()
  @IsOptional()
  isMatched: string;

  
@ApiPropertyOptional()
  @IsString()
  @IsOptional()
  aidServiceProfileId?: string;
  
@ApiPropertyOptional()
  @IsString()
  @IsOptional()
  aidServiceId?: string;
}

export class ServiceDeliveryConfirmationDTO {
  @ApiProperty()
  @IsBoolean()
  isVirtualLocation: boolean;
}

export class UpdateBookinDTO  extends BookingDTO{
  @ApiProperty()
  @IsEnum(BookingUpdateBookingStatus)
  bookingStatus: BookingUpdateBookingStatus;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  bookingStatusNote?: string;
}
