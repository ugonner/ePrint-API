import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, QueryRunner, SelectQueryBuilder, Transaction } from 'typeorm';
import { PaymentTransaction } from '../entities/transaction.entity';

import * as crypto from 'crypto';

import { v4 as uuidv4 } from 'uuid';
import { PaymentDTO, QueryPaymentTransactionDTO, VerifyPaymentDTO } from './dtos/payment.dto';
import { Booking } from '../entities/booking.entity';
import { BookingStatus } from '../booking/enums/booking.enum';
import { PaymentPurpose, PaymentStatus } from './enums/payment.enum';
import { Profile } from '../entities/user.entity';
import { ProfileWallet } from '../entities/user-wallet.entity';
import { BookingService } from '../booking/booking.service';
import { handleDateQuery } from '../shared/helpers/db';
import { IQueryResult } from '../shared/interfaces/api-response.interface';
@Injectable()
export class TransactionService {
  constructor(@InjectDataSource() private dataSource: DataSource, 
  private bookingService: BookingService
) {}

  private generateReference() {
    const input = `${uuidv4()}-${Date.now()}`;
    return crypto
      .createHash('sha256')
      .update(input)
      .digest('hex')
      .substr(0, 12);
  }

  async createTransaction(
    userId: string,
    dto: PaymentDTO,
  ): Promise<PaymentTransaction> {
    let transaction: PaymentTransaction;
    let errorData: unknown;
    const queryRunner = this.dataSource.createQueryRunner();
    try {
      
      await queryRunner.startTransaction();
      const { bookingId, ...transactionDto } = dto;

      const profile = await queryRunner.manager.findOneBy(Profile, { userId });
      let trxData = queryRunner.manager.create(
        PaymentTransaction,
        {...transactionDto, paymentStatus: PaymentStatus.PENDING},
      );

      if (dto.paymentPurpose === PaymentPurpose.SERVICE_PAYMENT) {
        const booking = await queryRunner.manager.findOne(Booking, {
          where: { id: bookingId },
          relations: [
            'profile',
            'aidServiceProfile',
            'aidServiceProfile.profile',
          ],
        });
        if (!booking) throw new NotFoundException('Booking not found');
        if (booking.paymentStatus === PaymentStatus.PAID)
          throw new BadRequestException(
            'This booking is already in progress state and has already been paid for',
          );

        const trxExists = await queryRunner.manager.findOne(
          PaymentTransaction,
          {
            where: {booking: { id: booking.id }},
            relations: ["profile"]
          },
        );
        if (trxExists) {
          if(trxExists.paymentStatus === PaymentStatus.PAID) throw new BadRequestException("Transaction already paid for");
          trxExists.paymentRef = await this.generateReference();
          transaction = await queryRunner.manager.save(PaymentTransaction, trxExists);
          return
        }
          
        trxData.amount = Number(booking.totalAmount);
        trxData.booking = booking;
      }

      trxData.paymentRef = this.generateReference();
      trxData.profile = profile;

      const trx = await queryRunner.manager.save(PaymentTransaction, trxData);

      await queryRunner.commitTransaction();
      transaction = trx;
    } catch (error) {
      errorData = error;
      await queryRunner.rollbackTransaction();
    } finally {
      await queryRunner.release();
      if (errorData) throw errorData;
      return transaction;
    }
  }

  async updatePayment(dto: VerifyPaymentDTO): Promise<PaymentTransaction> {
    let transaction: PaymentTransaction;
    let errorData: unknown;
    const queryRunner = this.dataSource.createQueryRunner();
    try {
      await queryRunner.startTransaction();
      const trx = await queryRunner.manager.findOne(PaymentTransaction, {
        where: { id: dto.transactionId },
        relations: ["profile", 'booking', "booking.aidService"],
      });
      if (!trx) throw new NotFoundException('Transaction record not found');
      if(trx.paymentStatus === dto.paymentStatus) throw new BadRequestException("Transaction already updated");
      if (trx.paymentPurpose === PaymentPurpose.SERVICE_PAYMENT) {
        const booking = trx.booking;
        if (!booking) throw new NotFoundException('Booking not found');

        if (dto.paymentStatus === PaymentStatus.PAID) {
          const userWallet = await queryRunner.manager.findOneBy(
            ProfileWallet,
            {
              profile: { userId: trx.profile?.userId },
            },
          );
          if (!userWallet) throw new NotFoundException('wallet not found');
          userWallet.pendingBalance =
            Number(userWallet.pendingBalance) + Number(trx.amount);
          await queryRunner.manager.save(ProfileWallet, { ...userWallet });

          this.bookingService.matchBookingWithServiceProfile(booking, {forceMatching:false})
        }
        booking.bookingStatus =
          dto.paymentStatus === PaymentStatus.PAID
            ? BookingStatus.IN_PROGRESS
            : BookingStatus.CANCELLED;
        booking.paymentStatus = dto.paymentStatus;
        await queryRunner.manager.save(Booking, booking);
      }
      else if (trx.paymentPurpose === PaymentPurpose.FUND_DEPOSIT) {
        
        if (dto.paymentStatus === PaymentStatus.PAID) {
          const userWallet = await queryRunner.manager.findOneBy(
            ProfileWallet,
            {
              profile: { userId: trx.profile?.userId },
            },
          );
          if (!userWallet) throw new NotFoundException('wallet not found');
          userWallet.fundedBalance =
            Number(userWallet.fundedBalance) + Number(trx.amount);
          await queryRunner.manager.save(ProfileWallet, { ...userWallet });
        }
         }
      
      trx.paymentStatus = dto.paymentStatus;
      const trxData = await queryRunner.manager.save(PaymentTransaction, trx);
      await queryRunner.commitTransaction();
      transaction = trxData;
    } catch (error) {
      errorData = error;
      await queryRunner.rollbackTransaction();
    } finally {
      await queryRunner.release();
      if (errorData) throw errorData;
      return transaction;
    }
  }

  async getTransaction(idOrReference: string): Promise<PaymentTransaction> {
    return await this.dataSource
      .createQueryRunner()
      .manager.findOne(PaymentTransaction, {
        where: [{ paymentRef: idOrReference }, { id: idOrReference }],
        relations: ['booking'],
      });
  }

   getQueryBuilder(): SelectQueryBuilder<PaymentTransaction> {
      return this.dataSource
        .getRepository(PaymentTransaction)
        .createQueryBuilder('paymentTransaction')
        .leftJoinAndSelect('paymentTransaction.profile', 'profile')
        .leftJoinAndSelect("paymentTransaction.booking", "booking")
    }
  
    async getTransactions(dto: QueryPaymentTransactionDTO): Promise<IQueryResult<PaymentTransaction>> {
      const {
        userId,
        searchTerm,
        startDate,
        endDate,
        dDate,
        order,
        page,
        limit,
        ...queryFields
      } = dto;
      const queryPage = page ? Number(page) : 1;
      const queryLimit = limit ? Number(limit) : 10;
      const queryOrder = order ? order.toUpperCase() : 'DESC';
      const queryOrderBy = 'createdAt';
  
      let queryBuilder = this.getQueryBuilder();
      queryBuilder.where('booking.isDeleted != :isDeleted', { isDeleted: true });
  
      if (queryFields) {
        Object.keys(queryFields).forEach((field) => {
          queryBuilder.andWhere(`booking.${field} = :value`, {
            value: queryFields[field],
          });
        });
      }
  
      if (startDate || endDate || dDate) {
        queryBuilder = handleDateQuery<PaymentTransaction>(
          { startDate, endDate, dDate, entityAlias: 'paymentTransaction' },
          queryBuilder,
          'createdAt',
        );
      }
  
      if(userId){
        queryBuilder.andWhere("profile.userId = :userId",  {userId})
      }
      
  
      if (searchTerm) {
        const searchFields = ['name', 'description'];
        let queryStr = `paymentTransaction.createdAt LIKE :searchTerm`;
        
        ['email', 'userId', 'firstName', 'lastName'].forEach((field) => {
          queryStr += ` OR LOWER(profile.${field}) LIKE :searchTerm`;
        });
        queryBuilder.andWhere(queryStr, {
          searchTerm: `%${searchTerm.toLowerCase().trim()}%`,
        });
      }
  
      const [data, total] = await queryBuilder
        .orderBy(`paymentTransaction.${queryOrderBy}`, queryOrder as 'ASC' | 'DESC')
        .skip((queryPage - 1) * queryLimit)
        .limit(queryLimit)
        .getManyAndCount();
  
      return { page: queryPage, limit: queryLimit, total, data };
    }
  
}
