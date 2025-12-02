import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { Profile } from '../entities/user.entity';
import { Booking } from '../entities/booking.entity';
import { Report } from '../entities/report.entity';
import { ServiceType } from '../shared/enums/review';
import { IQueryResult } from '../shared/interfaces/api-response.interface';
import {
  QueryReviewAndReportDTO,
  ReviewAndRatingDTO,
  UpdateReportDTO,
} from '../shared/dtos/review.dto';
import { handleDateQuery } from '../shared/helpers/db';
import { NotificationService } from '../notifiction/notification.service';
import { NotificationDto } from '../notifiction/dtos/notification.dto';
import {
  NotificationContext,
  NotificationEventType,
} from '../notifiction/enums/notification.enum';
import { ReportCommentDTO, ResolveReportDTO } from './dtos/report.sto';
import { ReportComment } from '../entities/report-comment.entity';
import { QueryRequestDTO } from '../shared/dtos/query-request.dto';
import { AidServiceProfile } from '../entities/aid-service-profile.entity';

@Injectable()
export class ReportService {
  constructor(
    @InjectDataSource()
    private dataSource: DataSource,
    private notificationService: NotificationService,
  ) {}

  async createReport(dto: ReviewAndRatingDTO, userId: string): Promise<Report> {
    let newReport: Report;
    let errorData: unknown;
    const queryRunner = this.dataSource.createQueryRunner();
    try {
      await queryRunner.startTransaction();
      const profile = await queryRunner.manager.findOneBy(Profile, { userId });

      if (!profile) throw new BadRequestException('User profile not found');
      let aidServiceProfile: AidServiceProfile;
      let entityOwner: Profile;
      if (dto.serviceType === ServiceType.BOOKING) {
        const booking = await queryRunner.manager.findOne(Booking, {
          where: { id: dto.serviceTypeEntityId },
          relations: ['aidServiceProfile', 'aidServiceProfile.profile'],
        });
        if (!booking) throw new NotFoundException('boooking not found');

        aidServiceProfile = booking.aidServiceProfile;
        entityOwner = booking.aidServiceProfile.profile;
      } else if (dto.serviceType === ServiceType.APP_PROFILE) {
        aidServiceProfile = await queryRunner.manager.findOne(AidServiceProfile, {
          where: { profile: {email: `${process.env.OFFICIAL_PROFILE_EMAIL}`} },
          relations: ['profile'],
        });
        
        entityOwner = aidServiceProfile?.profile;
      }

      const reportData = queryRunner.manager.create(Report, dto);
      reportData.profile = profile;
      reportData.entityOwner = entityOwner;
      reportData.profileId = profile.id;
      
      const savedReport = await queryRunner.manager.save(Report, reportData);
      await queryRunner.commitTransaction();
      newReport = savedReport;

      const notDto: NotificationDto = {
        creator: profile,
        receivers: [entityOwner, profile],
        context: NotificationContext.REPORT,
        contextEntityId: savedReport.id,
        notificationEventType: NotificationEventType.REPORT,
        title: NotificationEventType.REPORT,
        description: 'Report recorded successfully, being reviewed',
        data: {
          link: `${process.env.APP_URL}/report/report?rid=${savedReport.id}`,
          by: profile.firstName,
          entity: dto.serviceType,
        },
      };
      this.notificationService.sendNotification(notDto, {
        sendEmail: true,
        notifyAdmin: true,
      });
    } catch (error) {
      errorData = error;
      await queryRunner.rollbackTransaction();
    } finally {
      await queryRunner.release();
      if (errorData) throw errorData;
      return newReport;
    }
  }

  async updateReport(dto: UpdateReportDTO, userId: string): Promise<Report> {
    let updatedReport: Report;
    let errorData: unknown;
    const queryRunner = this.dataSource.createQueryRunner();
    try {
      await queryRunner.startTransaction();
      const profile = await queryRunner.manager.findOneBy(Profile, { userId });
      if (!profile) throw new NotFoundException('User profile not found');

      const report = await queryRunner.manager.findOneBy(Report, {
        id: dto.reportId,
      });
      if (!report) throw new NotFoundException('Report not found');
      report.resolvedById = profile.id;
      if (dto.comment) report.comment = dto.comment;
      if (dto.resolved == false) report.isResolved = false;
      else if (dto.resolved == true) report.isResolved = true;

      await queryRunner.manager.save(Report, { ...report });
      await queryRunner.commitTransaction();
      updatedReport = report;
    } catch (error) {
      errorData = error;
      await queryRunner.rollbackTransaction();
    } finally {
      await queryRunner.release();
      if (errorData) throw errorData;
      return updatedReport;
    }
  }

  async getReports(
    dto: QueryReviewAndReportDTO,
  ): Promise<IQueryResult<Report>> {
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
    const queryOrderBy = 'createdAt';

    let queryBuilder = this.dataSource
      .getRepository(Report)
      .createQueryBuilder('report');
    queryBuilder.leftJoinAndSelect(
      'profile',
      'profile',
      'report.profileId = profile.id',
    );
    queryBuilder.leftJoin(
      'profile',
      'adminProfile',
      'report.resolvedById = profile.id',
    )
    .leftJoinAndSelect("report.entityOwner", "entityOwner")

    queryBuilder.where('booking.isDeleted != :isDeleted', { isDeleted: true });

    if (queryFields) {
      Object.keys(queryFields).forEach((field) => {
        queryBuilder.andWhere(`report.${field} = :value`, {
          value: queryFields[field],
        });
      });
    }

    if (startDate || endDate || dDate) {
      queryBuilder = handleDateQuery<Report>(
        { startDate, endDate, dDate, entityAlias: 'report' },
        queryBuilder,
        'createdAt',
      );
    }

    if (searchTerm) {
      const searchFields = ['userId', 'firstName', 'lastName'];
      let queryStr = `LOWER(serviceProfile.email) LIKE :searchTerm`;
      searchFields.forEach((field) => {
        queryStr += ` OR LOWER(serviceProfile.${field}) LIKE :searchTerm`;
      });
      ['email', 'userId', 'firstName', 'lastName'].forEach((field) => {
        queryStr += ` OR LOWER(profile.${field}) LIKE :searchTerm`;
      });
      ['name'].forEach((field) => {
        queryStr += ` OR LOWER(aidServiceProfile.${field}) LIKE :searchTerm`;
      });
      queryBuilder.andWhere(queryStr, {
        searchTerm: `%${searchTerm.toLowerCase().trim()}%`,
      });
    }

    const [data, total] = await queryBuilder
      .orderBy(`report.${queryOrderBy}`, queryOrder as 'ASC' | 'DESC')
      .skip((queryPage - 1) * queryLimit)
      .limit(queryLimit)
      .getManyAndCount();

    return { page: queryPage, limit: queryLimit, total, data };
  }

  async commentReport(reportId: number, userId: string, dto: ReportCommentDTO): Promise<ReportComment> {
    let newReportComment: ReportComment;
    let errorData: unknown;
    const queryRunner = this.dataSource.createQueryRunner();

    try{
      await queryRunner.startTransaction();
      const profile = await queryRunner.manager.findOneBy(Profile, {userId});
      if(!profile) throw new NotFoundException("Profile not found");

      const report = await queryRunner.manager.findOne(Report, {
        where: {id: reportId},
        relations: ["entityOwner"]
      });
      if(!report) throw new NotFoundException("Report not found");


      const reportComment: ReportComment = queryRunner.manager.create(ReportComment, {
        comment: dto.comment,
        profile,
        report
      } as Partial<ReportComment>);
      const savedReportComment = await queryRunner.manager.save(ReportComment, reportComment);
      await queryRunner.commitTransaction();
      newReportComment = savedReportComment;

      const notDto: NotificationDto = {
        creator: profile,
        receivers: [report.entityOwner],
        context: NotificationContext.REPORT,
        contextEntityId: reportId,
        notificationEventType: NotificationEventType.REPORT_COMMENT,
        title: NotificationEventType.REPORT_COMMENT,
        description: `a response has been made to repor`,
        avatar: profile.avatar,
        data: {
          "link": `${process.env.APP_URL}/report/report?rid=${reportId}`,
          "by": profile.firstName
        }
      }
      this.notificationService.sendNotification(notDto, {
        sendEmail: true,
        notifyAdmin: true
      })
      
    }catch(error){
      errorData = error;
      await queryRunner.rollbackTransaction();
    }finally{
      await queryRunner.release();
      if(errorData) throw errorData;
      return newReportComment;
    }
  }

  

  async resolveReport(reportId: number, userId: string, dto: ResolveReportDTO): Promise<Report> {
    let updatedReport: Report;
    let errorData: unknown;
    const queryRunner = this.dataSource.createQueryRunner();

    try{
      await queryRunner.startTransaction();
      const profile = await queryRunner.manager.findOneBy(Profile, {userId});
      if(!profile) throw new NotFoundException("Profile not found");

      const report = await queryRunner.manager.findOne(Report, {
        where: {id: reportId},
        relations: ["entityOwner"]
      });
      if(!report) throw new NotFoundException("Report not found");
      report.isResolved = dto.isResolved;
      report.resolvedById = profile.id;
      await queryRunner.manager.save(Report, {...report});

      
      await queryRunner.commitTransaction();
      
      updatedReport = report;

      this.commentReport(reportId, userId, {comment: NotificationEventType.REPORT_RESOLUTION})
      .catch((err) => console.log("Error recording resolution comment", err))
      
      const notDto: NotificationDto = {
        creator: profile,
        receivers: [report.entityOwner],
        context: NotificationContext.REPORT,
        contextEntityId: reportId,
        notificationEventType: NotificationEventType.REPORT_RESOLUTION,
        title: NotificationEventType.REPORT_RESOLUTION,
        description: `Report resolved`,
        avatar: profile.avatar,
        data: {
          "link": `${process.env.APP_URL}/report/report?rid=${reportId}`,
          "by": profile.firstName
        }
      }
      this.notificationService.sendNotification(notDto, {
        sendEmail: true,
        notifyAdmin: true
      })
      
    }catch(error){
      errorData = error;
      await queryRunner.rollbackTransaction();
    }finally{
      await queryRunner.release();
      if(errorData) throw errorData;
      return updatedReport;
    }
  }

  
  async getReportComments(reportId: number, dto: QueryRequestDTO): Promise<IQueryResult<ReportComment>> {
    const {page, limit} = dto;
    const queryPage = page ? Number(page) : 1;
    const queryLimit = limit ? Number(limit) : 10;

    const [data, total] = await this.dataSource.getRepository(ReportComment).findAndCount({
      where: {report: {id: reportId}},
      skip: queryPage - 1,
      take: queryLimit,
      order: {createdAt: "DESC"},
      relations: ["profile"]
    });
    return {page: queryPage, limit: queryLimit, total, data};
  }

  async getReport(reprotId: number): Promise<Report> {
    return this.dataSource.getRepository(Report).findOne({
      where: {id: reprotId},
      relations: ["entityOwner", "profile"]
    })
  }
}
