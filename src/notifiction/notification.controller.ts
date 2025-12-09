import { Controller, Get, UseGuards } from '@nestjs/common';
import { NotificationService } from './notification.service';
import { JwtGuard } from '../shared/guards/jwt.guards';
import { ApiResponse } from '../shared/helpers/apiresponse';
import { User } from '../shared/guards/decorators/user.decorator';

@Controller("notification")
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

    @Get("update-app-version")
    async updateAppVersion(){
        const detail = "Nice New Update";
        const res = await this.notificaationService.updateAppVersion({detail});
        return ApiResponse.success("App version update successful", res);
    }

    @Get("app-version")
    async getAppVersion(){
        const res = await this.notificaationService.getLastAppVersion();
        return ApiResponse.success("Last update fetched successfully", res);
    }
}
