import { Injectable, Logger } from '@nestjs/common';
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

  
}
