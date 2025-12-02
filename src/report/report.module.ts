import { Module } from '@nestjs/common';
import { ReportController } from './report.controller';
import { ReportService } from './report.service';
import { NotificationModule } from '../notifiction/notification.module';

@Module({
  imports: [NotificationModule],
  controllers: [ReportController],
  providers: [ReportService]
})
export class ReportModule {}
