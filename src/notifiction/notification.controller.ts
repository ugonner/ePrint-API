import { Controller, Get, UseGuards } from '@nestjs/common';
import { NotificationService } from './notification.service';
import { JwtGuard } from '../shared/guards/jwt.guards';
import { ApiResponse } from '../shared/helpers/apiresponse';
import { User } from '../shared/guards/decorators/user.decorator';

@Controller('notifiction')
export class NotificationController {
    constructor(private notificaationService: NotificationService){}

    // @Get()
    // @UseGuards(JwtGuard)
    // async getNotifications(
    //     @User("userId") userId: string
    // ){
    //     const res = await this.notificaationService.getNotifications(userId);
    //     return ApiResponse.success("Notifications fetched successfully", res)
    // }
}
