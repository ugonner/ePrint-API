import {
    IsEmail,
    IsNotEmpty,
    IsNumber,
    IsOptional,
    IsString,
  } from 'class-validator';
import { VerifyPaymentDTO } from './payment.dto';
import { PaystackCurrency } from '../enums/paystack.enum';
  
  export class InitiatePaymentDto {
    @IsNumber()
    amount: number;

    @IsString()
    paymentRef: string;
  
    @IsString()
    userId: string;
  
    @IsEmail()
    email: string;
  
    @IsOptional()
    channels?: string[];
  
    currency?: string = PaystackCurrency.NGN;
  }
  
  
  export class PaystackInitiatePaymentResponseDto {
    authorization_url: string;
    access_code: string;
    reference: string;
  }
  

  export class PaystackVerifyPaymentResponseDto {
    amount: number;
    currency: string;
    status: 'success' | 'abandoned' | 'failed';
    reference: string;
    authorization: any;
    customer: {
      email: string;
    };
    metadata: VerifyPaymentDTO;
  }
  
  export class PaystackVerifyPaymentAPIResponse {
    status: boolean;
    data: PaystackVerifyPaymentResponseDto;
  }
  
  export class PaystackWebHookPayload {
    event: string;
    data: {
      reference: string;
      status: string;
      amount: number;
      currency: string;
      metadata: VerifyPaymentDTO;
    };
    meta?: unknown;
  }
  