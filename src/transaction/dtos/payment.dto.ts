import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsEmail, IsEnum, IsNumber, IsOptional, IsString } from "class-validator";
import { PaymentMethod, PaymentPurpose, PaymentStatus } from "../enums/payment.enum";
import { QueryDateDTO } from "../../shared/dtos/query-request.dto copy";

export class PaymentDTO {
    @ApiProperty()
    @IsNumber()
    @IsOptional()
    bookingId?: number;

    @ApiPropertyOptional()
    @IsNumber()
    @IsOptional()
    amount?: number;

    @ApiProperty()
    @IsEnum(PaymentMethod)
    paymentMethod: PaymentMethod;

    @ApiProperty()
    @IsEnum(PaymentPurpose)
    paymentPurpose: PaymentPurpose;

}

export class VerifyPaymentDTO{
    @ApiProperty()
    @IsString()
    transactionId: string;

    @ApiProperty()
    @IsEnum(PaymentStatus)
    paymentStatus: PaymentStatus;
}

export class QueryPaymentTransactionDTO extends QueryDateDTO {
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  userId: string;
  
@ApiPropertyOptional()
  @IsEnum(PaymentStatus)
  @IsOptional()
  paymentStatus: PaymentStatus;
}




  