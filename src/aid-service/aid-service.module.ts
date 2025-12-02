import { Module } from '@nestjs/common';
import { AidServiceService } from './aid-service.service';
import { AidServiceController } from './aid-service.controller';
import { MailModule } from '../mail/mail.module';
import { FileUploadModule } from '../file-upload/file-upload.module';
import { NotificationModule } from '../notifiction/notification.module';

@Module({
  imports: [
    FileUploadModule,
    NotificationModule
  ],
  providers: [AidServiceService],
  controllers: [AidServiceController],
  exports: [AidServiceService]
})
export class AidServiceModule {}
