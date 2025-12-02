import {
  Injectable,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import axios, { AxiosInstance } from 'axios';

import { v4 as uuidv4 } from 'uuid';
import * as crypto from "crypto";
import { TransactionService } from './transaction.service';
import { InitiatePaymentDto, PaystackInitiatePaymentResponseDto, PaystackVerifyPaymentAPIResponse } from './dtos/paystack.dto';
import { VerifyPaymentDTO } from './dtos/payment.dto';

@Injectable()
export class PaystackService {
  private axiosInstance: AxiosInstance;

  constructor(
    private transactionService: TransactionService
  ) {
    const secretKey = process.env.PAYSTACK_SECRET_KEY;
    const baseUrl = process.env.PAYSTACK_BASE_URL;

    this.axiosInstance = axios.create({
      baseURL: baseUrl,
      headers: {
        Authorization: `Bearer ${secretKey}`,
        'Content-Type': 'application/json',
      },
    });
  }


  async initiatePayment(
    payload: InitiatePaymentDto,
    metadata: VerifyPaymentDTO,
    bookingId: number
  ): Promise<PaystackInitiatePaymentResponseDto> {
    try {
      let callback_page = `/transaction/verify-payment/paystack`;
      
      const body = {
        ...payload,
        amount: payload.amount * 100, // Convert to kobo for NGN
        callback_url: `${process.env.APP_URL}${callback_page}`,
        reference: `${payload.paymentRef}`,
        metadata,
      };
      const response = await this.axiosInstance.post(
        '/transaction/initialize',
        body,
      );
      return response.data;
    } catch (error) {
     let errMessage = ""
     if (axios.isAxiosError(error)) {
      
      const paystackMessage =
        error.response?.data?.message ||
        error.response?.data?.data ||
        'Unknown Paystack error';
      console.error('Paystack message:', paystackMessage);
      errMessage = paystackMessage;
    } else {
      errMessage = error.message;
    }

      console.log('paystack ', error.message);
      throw new HttpException(
        `Error initializing payment link: ${errMessage}`,
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  // Verify Payment
  async verifyPayment(reference: string): Promise<PaystackVerifyPaymentAPIResponse> {
    try {
      const response = await this.axiosInstance.get(
        `/transaction/verify/${reference}`,
      );
      return response.data;
    } catch (error) {
      throw new HttpException(
        'Error verifying payment',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  verifySignatureByHash(body: crypto.BinaryLike, signature: string): boolean {
    const secretKey = process.env.PAYSTACK_SECRET_KEY;
    const hash = crypto
      .createHmac('sha512', secretKey)
      .update(body)
      .digest('hex');

    return hash === signature;
  }

}
