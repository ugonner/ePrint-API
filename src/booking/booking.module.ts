import { Module } from '@nestjs/common';
import { BookingController } from './booking.controller';
import { BookingService } from './booking.service';
import { NotificationModule } from '../notifiction/notification.module';
import { FileUploadModule } from '../file-upload/file-upload.module';

@Module({
  imports: [
    NotificationModule,
    FileUploadModule
  ],
  controllers: [BookingController],
  providers: [BookingService],
  exports: [BookingService]
})
export class BookingModule {}
