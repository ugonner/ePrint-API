import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { QueryReviewAndReportDTO, ReviewAndRatingDTO } from '../shared/dtos/review.dto';
import { ReviewAndRating } from '../entities/review.entity';
import { Profile } from '../entities/user.entity';
import { ServiceType } from '../shared/enums/review';
import { Booking } from '../entities/booking.entity';
import { IQueryResult } from '../shared/interfaces/api-response.interface';
import { handleDateQuery } from '../shared/helpers/db';
import { NotificationService } from '../notifiction/notification.service';
import { NotificationDto } from '../notifiction/dtos/notification.dto';
import { NotificationContext, NotificationEventType } from '../notifiction/enums/notification.enum';
import { AidServiceProfile } from '../entities/aid-service-profile.entity';

@Injectable()
export class ReviewService {
    constructor(
        @InjectDataSource()
        private dataSource: DataSource,
        private notificationService: NotificationService
    ){}

    async createRating(dto: ReviewAndRatingDTO, userId: string): Promise<ReviewAndRating> {
        let newReview: ReviewAndRating;
        let errorData: unknown;
        const queryRunner = this.dataSource.createQueryRunner();
        try{
            await queryRunner.startTransaction();
            
            const profile = await queryRunner.manager.findOneBy(Profile, {userId});
            
            if(!profile) throw new BadRequestException("User profile not found");
            let aidServiceProfile: AidServiceProfile;
            let entityOwner: Profile;
            if(dto.serviceType === ServiceType.BOOKING) {
                const booking = await queryRunner.manager.findOne(Booking, {
                    where: {id: dto.serviceTypeEntityId},
                    relations: ["aidServiceProfile", "aidServiceProfile.profile"]
                });
                if(!booking) throw new NotFoundException("boooking not found");
                if(!booking.aidServiceProfile) throw new BadRequestException("booking has not been matched with a provider yet");
                if(booking.aidServiceProfile.profile?.userId === userId) throw new BadRequestException("This service is provided by you, You can not review your own service")
                aidServiceProfile = booking.aidServiceProfile;
                entityOwner = booking.aidServiceProfile.profile;
                booking.rating = dto.rating;
                booking.review = dto.review;
                await queryRunner.manager.save(Booking, {...booking})
            }
            else if(dto.serviceType === ServiceType.APP_PROFILE) {
                aidServiceProfile = await queryRunner.manager.findOne(AidServiceProfile, {
                  where: {profile: {email: `${process.env.OFFICIAL_PROFILE_EMAIL}`}}
                });
                
                entityOwner = aidServiceProfile.profile;
              }

            if(!aidServiceProfile) throw new NotFoundException("Service profile not found");
            aidServiceProfile.averageRating = ((Number(aidServiceProfile.averageRating) * Number(aidServiceProfile.noOfRatings)) + Number(dto.rating)) / (Number(aidServiceProfile.noOfRatings) + 1);
            aidServiceProfile.noOfRatings = Number(aidServiceProfile.noOfRatings) + 1;
            await queryRunner.manager.save(AidServiceProfile, {...aidServiceProfile});

            const reviewData = queryRunner.manager.create(ReviewAndRating, dto);
            
            reviewData.profileId = profile.id
            const savedReview = await queryRunner.manager.save(ReviewAndRating, reviewData);
            await queryRunner.commitTransaction();
            newReview = savedReview;

            const notDto: NotificationDto = {
              creator: profile,
              receivers: [entityOwner, profile],
              context: NotificationContext.REVIEW_RATING,
              contextEntityId: savedReview.id,
              notificationEventType: NotificationEventType.REVIEW_AND_RATING_MADE,
              title: NotificationEventType.REVIEW_AND_RATING_MADE,
              description: "Review recorded",
              data: {
                link: `${process.env.APP_URL}/review/single?rid=${savedReview.id}`
              }
            }
            this.notificationService.sendNotification(notDto, {
              notifyAdmin: false,
              sendEmail: true
            });
        }catch(error){
            errorData = error;
            await queryRunner.rollbackTransaction();
        }finally{
            await queryRunner.release();
            if(errorData) throw errorData;
            return newReview;
        }
    }

    async getReviews(dto: QueryReviewAndReportDTO): Promise<IQueryResult<ReviewAndRating>> {
        const {
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
        const queryOrderBy =  "createdAt";
    
        let queryBuilder = this.dataSource.getRepository(ReviewAndRating).createQueryBuilder("review");
        queryBuilder.leftJoinAndSelect("profile", "profile", "review.profileId = profile.id");
        if(dto.serviceType === ServiceType.BOOKING) {
            queryBuilder.leftJoinAndSelect("booking", "booking", "review.serviceEntityId = booking.id")
            .leftJoinAndSelect("booking.aidServiceProfile", "aidServiceProfile");
        }
        else if(dto.serviceType === ServiceType.APP_PROFILE) {
            queryBuilder.leftJoinAndSelect("profile", "appProfile", "review.serviceEntityId = profile.id" )
            .leftJoinAndSelect("appProfile.aidServiceProfile", "aidServiceProfile");
        }
        queryBuilder.leftJoinAndSelect("aidServiceProfile.profile", "serviceProfile");
        
        queryBuilder.where("booking.isDeleted != :isDeleted", {isDeleted: true});
    
        if (queryFields) {
          Object.keys(queryFields).forEach((field) => {
            queryBuilder.andWhere(`review.${field} = :value`, {
              value: queryFields[field],
            });
          });
        }
    
        if (startDate || endDate || dDate) {
          queryBuilder = handleDateQuery<ReviewAndRating>(
            { startDate, endDate, dDate, entityAlias: 'review' },
            queryBuilder,
            'createdAt',
          );
        }
    
    
    
        if (searchTerm) {
          const searchFields = ["userId","firstName", "lastName"];
          let queryStr = `LOWER(serviceProfile.email) LIKE :searchTerm`;
          searchFields.forEach((field) => {
            queryStr += ` OR LOWER(serviceProfile.${field}) LIKE :searchTerm`;
          });
          ["email", "userId","firstName", "lastName"].forEach((field) => {
            queryStr += ` OR LOWER(profile.${field}) LIKE :searchTerm`;
          });
          ["name"].forEach((field) => {
            queryStr += ` OR LOWER(aidServiceProfile.${field}) LIKE :searchTerm`;
          });
          queryBuilder.andWhere(queryStr, {
            searchTerm: `%${searchTerm.toLowerCase().trim()}%`,
          });
        }
    
        
        const [data, total] = await queryBuilder
          .orderBy(`review.${queryOrderBy}`, queryOrder as 'ASC' | 'DESC')
          .skip((queryPage - 1) * queryLimit)
          .limit(queryLimit)
          .getManyAndCount();
    
        return { page: queryPage, limit: queryLimit, total, data };
      }
 
      
}
