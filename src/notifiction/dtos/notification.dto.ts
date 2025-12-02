import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
} from 'class-validator';
import { NotificationContext, NotificationEventType } from '../enums/notification.enum';
import { Profile } from '../../entities/user.entity';
import { isStringObject } from 'util/types';

export enum DeviceType {
  ANDROID = 'android',
  IOS = 'ios',
  WEB = 'web',
}

export enum PushStatus {
  ENABLE = 'ACTIVE',
  DISABLE = 'INACTIVE',
}
export class DeviceTokenDto {
  @IsNotEmpty()
  @IsString()
  device_token: string;
}
export class CreateNotificationTokenDto {
  @IsNotEmpty()
  @IsEnum(DeviceType)
  device_type: DeviceType;

  @IsNotEmpty()
  @IsString()
  device_token: string;
}

export class NotificationDto {

  @ApiProperty()
  @IsString()
  title: string;

@ApiPropertyOptional()
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional()
  @IsObject()
  @IsOptional()
  data?: Record<string, unknown>;

  
  
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  avatar?: string;

  @ApiProperty()
  @IsEnum(NotificationEventType)
  notificationEventType: NotificationEventType;

  @ApiProperty()
  @IsEnum(NotificationContext)
  context: NotificationContext;

  @ApiPropertyOptional()
  @IsNumber()
  @IsOptional()
  contextEntityId: number;

  
  @ApiProperty()
  @IsObject()
  creator: Profile;

  @ApiProperty()
  @IsObject({each: true})
  @IsArray()
  receivers: Profile[];


}

export class CreateNotificationDto extends NotificationDto {
  @IsNotEmpty()
  @IsString()
  user_id: string;
}

export class SubscribeToTopicDto extends DeviceTokenDto {
  @IsNotEmpty()
  @IsString({ each: true })
  topics: string[];
}
