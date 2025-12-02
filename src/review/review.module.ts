import { Module } from '@nestjs/common';
import { ReviewController } from './review.controller';
import { ReviewService } from './review.service';
import { NotificationModule } from '../notifiction/notification.module';

@Module({
  imports: [NotificationModule],
  controllers: [ReviewController],
  providers: [ReviewService]
})
export class ReviewModule {}
