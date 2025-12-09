import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { IMail } from '../shared/interfaces/email.interface';
import { DataSource } from 'typeorm';
import { InjectDataSource } from '@nestjs/typeorm';
import { MailService } from '../mail/mail.service';
import { NotificationDto } from './dtos/notification.dto';
import { Notification } from '../entities/notification.entity';
import { MailDTO } from '../mail/dtos/mail.dto';
import { IQueryResult } from '../shared/interfaces/api-response.interface';
import { QueryDateDTO } from '../shared/dtos/query-request.dto copy';
import { dot } from 'node:test/reporters';
import { AppVersion } from '../entities/app-version.entity';
import { AppVersionDTO } from './dtos/app-version.dto';

@Injectable()
export class NotificationService {
  constructor(
    @InjectDataSource()
    private dataSource: DataSource,
    private mailService: MailService,
  ) {}

  async createNotification(dto: NotificationDto): Promise<Notification[]> {
    let newNotifications: Notification[];
    let errorData: unknown;
    const queryRunner = this.dataSource.createQueryRunner();
    try {
      await queryRunner.startTransaction();

      const { receivers, ...notificationDto } = dto;
      const notificationDatas = receivers.map((receiver) => {
        return queryRunner.manager.create(Notification, {
          ...notificationDto,
          receiver,
        });
      });
      const savedNotifications = await queryRunner.manager.save(
        Notification,
        notificationDatas,
      );

      await queryRunner.commitTransaction();
      newNotifications = savedNotifications;
    } catch (error) {
      errorData = error;
      await queryRunner.rollbackTransaction();
    } finally {
      await queryRunner.release();
      if (errorData) throw errorData;
      return newNotifications;
    }
  }

  async sendEmailFromNotification(dto: NotificationDto, templatePath?: string) {
    const mailDto: MailDTO = {
      to: dto.receivers.map((recv) => recv?.email),
      subject: dto.notificationEventType,
      template: templatePath,
      context: {
        message: dto.description,
        entries: dto.data,
      },
    };
    await this.mailService.sendEmail(mailDto);
  }

  async sendNotification(
    dto: NotificationDto,
    config: {
      sendEmail: boolean;
      emailTemplate?: string;
      notifyAdmin: boolean;
    },
  ) {
    try {
      if (config.sendEmail)
        await this.sendEmailFromNotification(dto, config.emailTemplate);
      await this.createNotification(dto);
    } catch (error) {
      console.log(
        `Error sending notifications: ${dto.notificationEventType}`,
        error.message,
      );
    }
  }

  async updateAppVersion(dto?: AppVersionDTO): Promise<AppVersion> {
    let newVersion: AppVersion;
    let errorData: unknown;
    const queryRunner = this.dataSource.createQueryRunner();
    try {
      await queryRunner.startTransaction();
      let appVersion: AppVersion = queryRunner.manager.create(AppVersion, {
        detail: dto.detail,
      });
      if (dto?.appVersionId) {
        appVersion = await queryRunner.manager.findOneBy(AppVersion, {
          id: dto.appVersionId,
        });
        if (!appVersion) throw new NotFoundException('Version not found');
      }
      appVersion.detail = dto.detail;
      await queryRunner.manager.save(AppVersion, appVersion);
      await queryRunner.commitTransaction();
      newVersion = appVersion;
    } catch (error) {
      errorData = error;

      await queryRunner.rollbackTransaction();
    } finally {
      await queryRunner.release();
      if (errorData) throw errorData;
      return newVersion;
    }
  }

  async getLastAppVersion(): Promise<AppVersion> {
    const versions = await this.dataSource.getRepository(AppVersion).find({take: 1, order: {id: "DESC"}});
    return versions[0];
  }
}
