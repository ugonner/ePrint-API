import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import {
  DataSource,
  DeleteQueryBuilder,
  QueryRunner,
  SelectQueryBuilder,
} from 'typeorm';
import {
  BookingDTO,
  CreateBookingDTO,
  QueryBookingDTO,
  UpdateBookinDTO,
  UpdateBookingProcessedMediaFilesDTO,
} from './dtos/booking.dto';
import { Booking } from '../entities/booking.entity';
import { Profile } from '../entities/user.entity';
import { AidService } from '../entities/aid-service.entity';

import { BookingStatus, DeliveryType } from './enums/booking.enum';
import { ProfileWallet } from '../entities/user-wallet.entity';
import { IQueryResult } from '../shared/interfaces/api-response.interface';
import { handleDateQuery } from '../shared/helpers/db';
import { NotificationService } from '../notifiction/notification.service';
import { NotificationDto } from '../notifiction/dtos/notification.dto';
import {
  NotificationContext,
  NotificationEventType,
} from '../notifiction/enums/notification.enum';
import { AidServiceProfile } from '../entities/aid-service-profile.entity';
import { FileUploadService } from '../file-upload/file-upload.service';
import { AttachmentDTO } from '../file-upload/dtos/file.dto';

@Injectable()
export class BookingService {
  constructor(
    @InjectDataSource() private dataSource: DataSource,
    private notificationService: NotificationService,
    private fileUploadService: FileUploadService
  ) {}

  getBookingTotalAmount(dto: BookingDTO, aidService: AidService): number {
    const totalCopies = dto.rawMediaFiles?.reduce((acc, mediaFile) => {
      return acc + Number(mediaFile.copies)
    }, 0) || 0;
    
    const totalCost = Number(aidService.serviceRate) * totalCopies;

    const vat =
      (Number(process.env.VAT_RATE || 1) / 100) *
      totalCost;

    let transportationCost = /Anambra/i.test(dto.locationAddress?.state)
      ? 5000
      : 10000;
      if(dto.deliveryType === DeliveryType.PICK_UP) transportationCost = 0;
    
    let totalAmount = totalCost + vat + transportationCost;

    return totalAmount;
  }


  async createBooking(dto: CreateBookingDTO, userId: string): Promise<Booking> {
    let newBooking: Booking;
    let errorData: unknown;
    const queryRunner = this.dataSource.createQueryRunner();

    try {
      await queryRunner.startTransaction();
      const { aidServiceId, aidServiceProfileId, ...bookingDto } = dto;
      const profile = await queryRunner.manager.findOneBy(Profile, { userId });
      if (!profile) throw new NotFoundException('user not found');

      const aidService = await queryRunner.manager.findOneBy(AidService, {
        id: aidServiceId,
      });

      if (!aidService)
        throw new BadRequestException('Aid service does not exist');

      const endDate = new Date(
        new Date(bookingDto.startDate).getTime() + Number(60 * 60 * 1000),
      ).toISOString();

      const bookingInstance: Booking = queryRunner.manager.create(Booking, {
        ...bookingDto,
        startDate: bookingDto.startDate,
        endDate,
        aidService,
        profile,
      });
      bookingInstance.totalAmount = this.getBookingTotalAmount(bookingDto, aidService);
      bookingInstance.compositeBookingId = `${profile.userId}-${new Date(bookingDto.startDate).getTime()}`;

      const savedBooking = await queryRunner.manager.save(
        Booking,
        bookingInstance,
      );
      await queryRunner.commitTransaction();
      newBooking = savedBooking;

      const notificationDto: NotificationDto = {
        creator: profile,
        receivers: [profile],
        notificationEventType:
          NotificationEventType.AID_SERVICE_BOOKING_CREATION,
        context: NotificationContext.SERVICE_BOOKING,
        contextEntityId: savedBooking.id,
        title: NotificationEventType.AID_SERVICE_BOOKING_CREATION,
        description: 'A Booking has been created for a service with detail',
        avatar: profile.avatar || aidService?.avatar,
        data: {
          link: `${process.env.APP_URL}/booking/invoice?bi=${savedBooking.id}`,
          'Composte Booking No': savedBooking.compositeBookingId,
        },
      };
      this.notificationService.sendNotification(notificationDto, {
        sendEmail: true,
        notifyAdmin: true,
      });
    } catch (error) {
      errorData = error;
      await queryRunner.rollbackTransaction();
      Promise.allSettled(
        ([...(dto.rawMediaFiles || []), (dto.descriptionMedia || {})] as AttachmentDTO[]).map((fileOBJ) => this.fileUploadService.deleteFileLocal(fileOBJ.attachmentUrl))
      )
    } finally {
      await queryRunner.release();
      if (errorData) throw errorData;
      return newBooking;
    }
  }


  async updateBookingProcessedFiles( bookingId: number, dto: UpdateBookingProcessedMediaFilesDTO, userId: string): Promise<Booking> {
    let newBooking: Booking;
    let errorData: unknown;
    const queryRunner = this.dataSource.createQueryRunner();

    try {
      await queryRunner.startTransaction();
     const booking = await queryRunner.manager.findOne(Booking, {
      where: {id: bookingId},
      relations: ["profile", "aidServiceProfile", "aidServiceProfile.profile"]
     })
     if(!booking) throw new NotFoundException("BOOKING NOT FOUND");
     booking.processedMediaFiles = dto.processedMediaFiles;
      const savedBooking = await queryRunner.manager.save(
        Booking,
        booking,
      );
      await queryRunner.commitTransaction();
      newBooking = savedBooking;

      const notificationDto: NotificationDto = {
        creator: booking.profile,
        receivers: [booking.profile],
        notificationEventType:
          NotificationEventType.AID_SERVICE_BOOKING_CREATION,
        context: NotificationContext.SERVICE_BOOKING,
        contextEntityId: savedBooking.id,
        title: NotificationEventType.AID_SERVICE_BOOKING_CREATION,
        description: 'A Booking has been created for a service with detail',
        avatar: booking.profile.avatar,
        data: {
          link: `${process.env.APP_URL}/booking/invoice?bi=${savedBooking.id}`,
          'Composte Booking No': savedBooking.compositeBookingId,
        },
      };
      this.notificationService.sendNotification(notificationDto, {
        sendEmail: true,
        notifyAdmin: true,
      });
    } catch (error) {
      errorData = error;
      await queryRunner.rollbackTransaction();
      Promise.allSettled(
        ([...(dto.processedMediaFiles || [])] as AttachmentDTO[]).map((fileOBJ) => this.fileUploadService.deleteFileLocal(fileOBJ.attachmentUrl))
      )
    } finally {
      await queryRunner.release();
      if (errorData) throw errorData;
      return newBooking;
    }
  }


  async confirmBookingService(
    userId: string,
    bookingId: number,
    userType: { isProvider?: boolean; isUser?: boolean },
  ): Promise<Booking> {
    let updatedBooking: Booking;
    let errorData: unknown;
    const queryRunner = this.dataSource.createQueryRunner();
    try {
      await queryRunner.startTransaction();
      const profile = await queryRunner.manager.findOneBy(Profile, { userId });
      if (!profile) throw new NotFoundException('User profile not found');

      const booking = await queryRunner.manager.findOne(Booking, {
        where: { id: bookingId },
        relations: [
          'profile',
          'aidServiceProfile',
          'aidServiceProfile.profile',
        ],
      });
      if (!booking) throw new NotFoundException('booking not found');
      if (userType.isProvider) {
        if (booking.aidServiceProfile?.profile?.userId !== userId)
          throw new BadRequestException(
            'You are not the provider of this service',
          );
        booking.confirmedByProvider = true;
      }

      if (userType.isUser) {
        if (booking.profile?.userId !== userId)
          throw new BadRequestException(
            'You are not the owner of this booking',
          );
        booking.confirmedByUser = true;

        const bookingAidServiceProfile = await queryRunner.manager.findOneBy(
          AidServiceProfile,
          { profile: { email: `${process.env.OFFICIAL_PROFILE_EMAIL}` } },
        );
        const userWallet = await queryRunner.manager.findOneBy(ProfileWallet, {
          profile: { userId },
        });
        const providerWallet = await queryRunner.manager.findOneBy(
          ProfileWallet,
          {
            profile: { userId: bookingAidServiceProfile.profile.userId },
          },
        );

        userWallet.pendingBalance =
          Number(userWallet.pendingBalance) - Number(booking.totalAmount);
        providerWallet.earnedBalance =
          Number(providerWallet.earnedBalance) + Number(booking.totalAmount);
        await queryRunner.manager.save(ProfileWallet, [
          userWallet,
          providerWallet,
        ]);

        bookingAidServiceProfile.noOfServicesCompleted =
          Number(bookingAidServiceProfile.noOfServicesCompleted) + 1;
        await queryRunner.manager.save(
          AidServiceProfile,
          bookingAidServiceProfile,
        );
      }

      const savedBooking = await queryRunner.manager.save(Booking, booking);
      await queryRunner.commitTransaction();
      updatedBooking = savedBooking;

      const notDto: NotificationDto = {
        creator: profile,
        receivers: userType.isProvider
          ? [booking?.profile]
          : [booking.aidServiceProfile?.profile],
        context: NotificationContext.SERVICE_BOOKING,
        contextEntityId: bookingId,
        notificationEventType: NotificationEventType.AID_SERVICE_BOOKING_UPDATE,
        title: NotificationEventType.AID_SERVICE_BOOKING_UPDATE,
        description: `Booking Service has been confirmed as delivered by ${userType.isProvider ? 'Provider' : 'Client'}`,
        data: {
          link: `${process.env.APP_URL}/booking/invoice?bi=${savedBooking.id}`,
          'Composte Booking No': savedBooking.compositeBookingId,
        },
      };
      this.notificationService.sendNotification(notDto, {
        sendEmail: true,
        notifyAdmin: false,
      });
    } catch (error) {
      errorData = error;
      await queryRunner.rollbackTransaction();
    } finally {
      await queryRunner.release();
      if (errorData) throw errorData;
      return updatedBooking;
    }
  }

  async getBooking(bookingId: number): Promise<Booking> {
    return this.dataSource.getRepository(Booking).findOne({
      where: { id: bookingId },
      relations: [
        'profile',
        'aidService',
        'aidServiceProfile',
        'aidServiceProfile.profile',
      ],
    });
  }
  async getBookingEligibleProfiles(dto: {
    aidServiceId: number;
    bookingStartDateTime: string;
    bookingEndDateTime: string;
  }): Promise<Profile[]> {
    const { bookingStartDateTime, aidServiceId, bookingEndDateTime } = dto;

    const oneHourAfterEndTime = new Date(
      new Date(bookingEndDateTime).getTime() + 1 * 60 * 60 * 1000,
    ).toISOString();
    const oneHourBeforeStartTime = new Date(
      new Date(bookingStartDateTime).getTime() - 1 * 60 * 60 * 1000,
    ).toISOString();
   
    const queryBuilder = this.dataSource
      .getRepository(Profile)
      .createQueryBuilder('profile');
    queryBuilder
      .innerJoinAndSelect('profile.aidServiceProfile', 'aidServiceProfile')
      .leftJoin('aidServiceProfile.bookings', 'bookings')
      .where('profile.isDeleted = false')
      .andWhere('aidServiceProfile.isDeleted = false')
      .andWhere(
        '((bookings.startDate) >= :oneHourAfterEndTime) OR ((bookings.endDate) <= :oneHourBeforeStartTime) OR bookings.id IS NULL',
        {
          oneHourAfterEndTime,
          oneHourBeforeStartTime
        },
      );

    return await queryBuilder.getMany();
  }

  async matchBookingWithServiceProfile(
    bookingData: Booking | number,
    config: { forceMatching: boolean },
  ): Promise<Booking> {
    let updatedBooking: Booking;
    let errorData: unknown;
    const queryRunner = this.dataSource.createQueryRunner();
    try {
      await queryRunner.startTransaction();
      const booking =
        typeof bookingData !== 'object'
          ? await queryRunner.manager.findOne(Booking, {
              where: { id: bookingData },
              relations: ['profile', 'aidService', 'aidServiceProfile'],
            })
          : (bookingData as Booking);

      if (!booking) throw new NotFoundException('booking not found');
      if (!config.forceMatching && booking.aidServiceProfile)
        throw new BadRequestException(
          'booking already matched with a provider',
        );

      const eligibleProfiles = await this.getBookingEligibleProfiles({
        bookingStartDateTime: booking.startDate,
        bookingEndDateTime: booking.endDate,
        aidServiceId: booking.aidService.id,
      });
      if (eligibleProfiles?.length > 0) {
        const sortedProfiles = eligibleProfiles.sort((a, b) => {
          (a as Profile & { score: number }).score = this.scoreProfileToBooking(
            a,
            booking,
          );
          (b as Profile & { score: number }).score = this.scoreProfileToBooking(
            b,
            booking,
          );
          return (
            (b as Profile & { score: number }).score -
            (a as Profile & { score: number }).score
          );
        });
        booking.aidServiceProfile = sortedProfiles[0].aidServiceProfile;
        booking.isMatched = true;
      }
      else if((!eligibleProfiles) || eligibleProfiles.length === 0) {
        const adminServiceProfile = await queryRunner.manager.findOne(AidServiceProfile, {
          where: {profile: {email: `${process.env.OFFICIAL_PROFILE_EMAIL}`.toLowerCase()}},
          relations: ["profile"]
        });
        booking.aidServiceProfile = adminServiceProfile;
        booking.isMatched = true;
      }
      const savedBooking = await queryRunner.manager.save(Booking, {
        ...booking,
      });
      await queryRunner.commitTransaction();
      updatedBooking = savedBooking;

      const notDto: NotificationDto = {
        creator: booking.profile,
        receivers: [booking.profile, booking.aidServiceProfile?.profile],
        context: NotificationContext.SERVICE_BOOKING,
        contextEntityId: savedBooking.id,
        notificationEventType:
          NotificationEventType.AID_SERVICE_BOOKING_PROVIDER_MATCH,
        title: NotificationEventType.AID_SERVICE_BOOKING_PROVIDER_MATCH,
        description: 'The booking has been matched with a provider',
        avatar:
          savedBooking.aidServiceProfile?.profile?.avatar ||
          booking.aidService?.avatar,
        data: {
          link: `${process.env.APP_URL}/booking/invoice?bi=${savedBooking.id}`,
          'Composte Booking No': savedBooking.compositeBookingId,
        },
      };
      this.notificationService.sendNotification(notDto, {
        notifyAdmin: true,
        sendEmail: true,
      });
    } catch (error) {
      errorData = error;
      await queryRunner.rollbackTransaction();
    } finally {
      await queryRunner.release();
      if (errorData) throw errorData;
      return updatedBooking;
    }
  }

  async updateBooking(
    userId: string,
    bookingId: number,
    dto: UpdateBookinDTO,
  ): Promise<Booking> {
    let updatedBooking: Booking;
    let errorData: unknown;
    const queryRunner = this.dataSource.createQueryRunner();
    try {
      await queryRunner.startTransaction();

      const profile = await queryRunner.manager.findOneBy(Profile, { userId });
      if (!profile) throw new NotFoundException('User profile not foud');
      const booking = await queryRunner.manager.findOne(Booking, {
        where: { id: bookingId },
        relations: [
          'profile',
          'aidService',
          'aidServiceProfile',
          'aidServiceProfile.profile',
        ],
      });
      if (!booking) throw new NotFoundException('booking not found');

      if (booking.bookingStatus !== BookingStatus.PENDING)
        throw new BadRequestException('You can no longor update booking');
      const savedBooking = await queryRunner.manager.save(Booking, {
        ...booking,
        ...(dto as BookingDTO),
      });
      await queryRunner.commitTransaction();
      updatedBooking = savedBooking;

      const notDto: NotificationDto = {
        creator: profile,
        receivers: [profile, booking.aidServiceProfile?.profile],
        context: NotificationContext.SERVICE_BOOKING,
        contextEntityId: savedBooking.id,
        notificationEventType: NotificationEventType.AID_SERVICE_BOOKING_UPDATE,
        title: NotificationEventType.AID_SERVICE_BOOKING_UPDATE,
        description: dto.bookingStatus
          ? `Booking status has been updated to ${dto.bookingStatus} by ${profile.firstName}`
          : `Booking information has been updated by ${profile.firstName}, please re-check booking`,
        avatar: profile.avatar,
        data: {
          link: `${process.env.APP_URL}/booking/invoice?bi=${savedBooking.id}`,
          'Composte Booking No': savedBooking.compositeBookingId,
        },
      };
      this.notificationService.sendNotification(notDto, {
        notifyAdmin: false,
        sendEmail: true,
      });
    } catch (error) {
      errorData = error;
      await queryRunner.rollbackTransaction();
    } finally {
      await queryRunner.release();
      if (errorData) throw errorData;
      return updatedBooking;
    }
  }

  scoreProfileToBooking(profile: Profile, booking: Booking): number {
    let score = 0;
    const targetAidProfile = profile.aidServiceProfile;
    if (profile.disabilityType) score += 5;

    const countryMatch = new RegExp(booking.locationAddress.country, 'i').test(
      targetAidProfile.locationAddress.country,
    );
    const stateMatch = new RegExp(booking.locationAddress.state, 'i').test(
      targetAidProfile.locationAddress.state,
    );
    const localityMatch = new RegExp(
      booking.locationAddress.locality,
      'i',
    ).test(targetAidProfile.locationAddress.locality);
    const cityMatch = new RegExp(booking.locationAddress.city, 'i').test(
      targetAidProfile.locationAddress.city,
    );
    if (countryMatch && stateMatch && localityMatch && cityMatch) score += 5;
    else if (countryMatch && stateMatch && localityMatch) score += 4;
    else if (countryMatch && stateMatch) score += 3;

    return score;
  }

  getQueryBuilder(): SelectQueryBuilder<Booking> {
    return this.dataSource
      .getRepository(Booking)
      .createQueryBuilder('booking')
      .leftJoinAndSelect('booking.profile', 'profile')
      .leftJoinAndSelect('booking.aidService', 'aidService')
      .leftJoin('booking.aidServiceProfile', 'aidServiceProfile')
      .leftJoin('aidServiceProfile.profile', 'aidServiceProfileProfile');
  }

  async getBookings(dto: QueryBookingDTO): Promise<IQueryResult<Booking>> {
    const {
      userId,
      aidServiceProfileId,
      aidServiceId,
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
      queryBuilder = handleDateQuery<Booking>(
        { startDate, endDate, dDate, entityAlias: 'booking' },
        queryBuilder,
        'createdAt',
      );
    }

    if (aidServiceId) {
      queryBuilder.andWhere(`aidService.id = :aidServiceId`, { aidServiceId });
    }
    if (aidServiceProfileId) {
      queryBuilder.andWhere(`aidServiceProfile.id = :aidServiceProfileId`, {
        aidServiceProfileId,
      });
    }
    if (userId) {
      queryBuilder.andWhere(
        'profile.userId = :userId OR aidServiceProfileProfile.userId = :userId',
        { userId },
      );
    }

    if (searchTerm) {
      const searchFields = ['name', 'description'];
      let queryStr = `LOWER(aidService.name) LIKE :searchTerm`;
      searchFields.forEach((field) => {
        queryStr += ` OR LOWER(aidService.${field}) LIKE :searchTerm`;
      });
      ['email', 'userId', 'firstName', 'lastName'].forEach((field) => {
        queryStr += ` OR LOWER(profile.${field}) LIKE :searchTerm`;
      });
      ['email', 'userId', 'firstName', 'lastName'].forEach((field) => {
        queryStr += ` OR LOWER(aidServiceProfileProfile.${field}) LIKE :searchTerm`;
      });
      queryBuilder.andWhere(queryStr, {
        searchTerm: `%${searchTerm.toLowerCase().trim()}%`,
      });
    }

    const [data, total] = await queryBuilder
      .orderBy(`booking.${queryOrderBy}`, queryOrder as 'ASC' | 'DESC')
      .skip((queryPage - 1) * queryLimit)
      .limit(queryLimit)
      .getManyAndCount();

    return { page: queryPage, limit: queryLimit, total, data };
  }
}
