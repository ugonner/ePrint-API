import { Body, Controller, Get, Header, Headers, HttpException, HttpStatus, Inject, Param, Post, Put, Query, RawBody, UseGuards } from '@nestjs/common';
import { TransactionService } from './transaction.service';
import { PaymentDTO, QueryPaymentTransactionDTO, VerifyPaymentDTO } from './dtos/payment.dto';
import { User } from '../shared/guards/decorators/user.decorator';
import { ApiResponse } from '../shared/helpers/apiresponse';
import { JwtGuard } from '../shared/guards/jwt.guards';
import { PaystackService } from './paystack.service';
import { PaymentMethod, PaymentStatus } from './enums/payment.enum';
import { InitiatePaymentDto, PaystackInitiatePaymentResponseDto, PaystackWebHookPayload } from './dtos/paystack.dto';
import { PaystackCurrency } from './enums/paystack.enum';
import { BinaryLike } from 'crypto';
import { WalletService } from './wallet.service';
import { BroadcastEvents } from '../shared/enums/events.enum';

@Controller('transaction')
export class TransactionController {
    constructor(
        private transactionService: TransactionService,
        private paystackService: PaystackService,
        private walletService: WalletService,
        
    ){}

    @Post()
    @UseGuards(JwtGuard)
    async createTransaction(
        @Body() payload: PaymentDTO,
        @User("userId") userId: string
    ){
        const res = await this.transactionService.createTransaction(userId, payload);
        return ApiResponse.success("transaction created successfullyy", res);
    }
    @Post("pay")
    @UseGuards(JwtGuard)
    async pay(
        @Body() payload: PaymentDTO,
        @User("userId") userId: string
    ){
        let res: PaystackInitiatePaymentResponseDto;
        const trx = await this.transactionService.createTransaction(userId, payload);
        if(payload.paymentMethod === PaymentMethod.PAYSTACK){
            const paymentData: InitiatePaymentDto = {
                userId: trx.profile?.userId,
                email: trx.profile?.email,
                amount: trx.amount,
                paymentRef: trx.paymentRef,
                currency: PaystackCurrency.NGN,
            };
            const metadata: VerifyPaymentDTO = {
                transactionId: trx.id,
                paymentStatus: trx.paymentStatus
            };
            res = await this.paystackService.initiatePayment(paymentData, metadata, payload.bookingId);
        }
        return ApiResponse.success("transaction created successfullyy", res);
    }

    @Get("verify-payment/:provider")
   async verifyPaymentStatus(
        @Query("reference") reference: string,
        @Param("provider") provider: string,
    ){
      const res = await this.paystackService.verifyPayment(reference);
        const metadata: VerifyPaymentDTO = {
                transactionId: res.data.metadata.transactionId,
                paymentStatus: /success/i.test(res.data.status) ? PaymentStatus.PAID : res.data.status as PaymentStatus
            };
           const transaction = await this.transactionService.updatePayment(metadata);
            transaction.paymentStatus = metadata.paymentStatus;
            
        
        return ApiResponse.success("Transction updated successfully", transaction);
    }

    
  @Post('/webhook/verify-payment/paystack')
  async handlePaystackWebhook(
    @RawBody() rawBody: Buffer,
    @Headers('x-paystack-signature') signature: string,
  ) {
    try {
      const isValid = this.paystackService.verifySignatureByHash(
        rawBody as BinaryLike,
        signature,
      );
      if (!isValid) {
        throw new HttpException('Invalid signature', HttpStatus.UNAUTHORIZED);
      }

      // Process the webhook payload
     const  payload = JSON.parse(rawBody.toString());
      payload.data.metadata.paymentStatus = /success/i.test(payload.data.status) ? PaymentStatus.PAID : payload.data.status as PaymentStatus;
      this.transactionService.updatePayment(payload.data.metadata);
      return ApiResponse.success("Payment handled", payload.data.metadata, HttpStatus.OK);
    } catch (error) {
      //console.error('Webhook error:', error);
      console.log('Error ', error.message);
      throw new HttpException(
        'Webhook processing failed',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

    @Put("status")
    @UseGuards(JwtGuard)
    async updateTransactionStatus(
        @Body() payload: VerifyPaymentDTO,
    ){
        const res = await this.transactionService.updatePayment(payload);
        return ApiResponse.success("Transction updated successfully", res);
    }

    @Get()
    async getTransactions(
      @Query() payload: QueryPaymentTransactionDTO
    ){
      const res = await this.transactionService.getTransactions(payload);
      return ApiResponse.success("Transations fetched successfullly", res)
    }

    @UseGuards(JwtGuard)
    @Get("wallet")
    async getUserWallet(
      @User("userId") userId: string
    ){
      const res = await this.walletService.getUserWallet(userId);
     
      return ApiResponse.success("User wallet fetched successfully", res);
    }

    
    @Get("/:reference")
    async getTransaction(
      @Param("reference") reference: string
    ){
      const res = await this.transactionService.getTransaction(reference);
      return ApiResponse.success("Transaction fetched successfully", res);
    }
}
