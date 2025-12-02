import { Body, Controller, Delete, Get, Param, ParseIntPipe, Post, Put, Query, UseFilters, UseGuards } from '@nestjs/common';
import { AidServiceService } from './aid-service.service';
import { AidServiceDTO, AidServiceProfileApplicationDTO, QueryAidServiceDTO, QueryAidServiceProfileDTO, RequestAidServiceDTO, UpdateUserAidServiceDTO, VerifyAidServiceProfileDTO } from './dtos/aid-service.dto';
import { User } from '../shared/guards/decorators/user.decorator';
import { Auth } from '../entities/auth.entity';
import { ApiResponse } from '../shared/helpers/apiresponse';
import { AidServiceType } from '../shared/enums/aid-service.enum';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AllExceptionFilter } from '../shared/interceptors/all-exceptions.filter';
import { JwtGuard } from '../shared/guards/jwt.guards';

@ApiTags("aid-service")
@ApiBearerAuth('access-token')
@UseFilters(AllExceptionFilter)
@Controller('aid-service')
export class AidServiceController {
    constructor(
        private aidServiceService: AidServiceService
    ){}

    @Post()
    @UseGuards(JwtGuard)
    async createAidService(
        @Body() payload: AidServiceDTO,
        @User("userId") userId: string
    ){
        const res = await this.aidServiceService.createAidService(userId, payload);
        return ApiResponse.success("Aid service created", res);
    }

    @Put("/:id")
    async editAidService(
        @Param("id", ParseIntPipe) aidServiceId: number,
        @Body() payload: AidServiceDTO
    ){
        const res = await this.aidServiceService.updateAidService(aidServiceId, payload);
        return ApiResponse.success("Aid serice edited successfully", res);
    }

    @Post("/profile/application")
    @UseGuards(JwtGuard)
    async createAidServiceProfileApplication(
        @Body() payload: AidServiceProfileApplicationDTO,
        @User("userId") userId: string,
        @Query() queryPayload: {ui: string}
    ){
       userId = queryPayload.ui ? queryPayload.ui : userId;
        const res = await this.aidServiceService.createOrUpdateAidServiceProfile(userId, payload);
        return ApiResponse.success("Application created successfully", res);
    }


    @Put("/profile/application")
    @UseGuards(JwtGuard)
    async updateAidServiceProfileApplication(
        @Body() payload: AidServiceProfileApplicationDTO,
        @User("userId") userId: string
    ){
        const res = await this.aidServiceService.createOrUpdateAidServiceProfile(userId, payload);
        return ApiResponse.success("Application created successfully", res);
    }

    @Get("/profile")
    async getAidServiceProfiles(
        @Query() payload: QueryAidServiceProfileDTO
    ){
        const res = await this.aidServiceService.getAidServiceProfiles(payload);
        return ApiResponse.success("Aid service profiles retrieved successfuly", res);
    }

    @Get("tag")
    async getTags(){
        const res = await this.aidServiceService.getTags();
        return ApiResponse.success("Tags fetched successfully", res);
    }
    
    @Get()
    async getAidServices(
        @Query() payload: QueryAidServiceDTO
    ){
        const res = await this.aidServiceService.getAidServices(payload);
        return ApiResponse.success("Aid services retrieved successfuly", res);
    }

    @Get("profile/:aidServiceProfileId")
    async getAidServiceProfile(
        @Param("aidServiceProfileId", new ParseIntPipe()) aidServiceProfileId: number
    ){
        const res = await this.aidServiceService.getAidServiceProfile(aidServiceProfileId);
        return ApiResponse.success("Aid service profile fetched successfully", res);
    }
    @Delete("/:id")
    @UseGuards(JwtGuard)
    async deleteAidService(
        @Param("id", new ParseIntPipe()) id: number
    ){
        const res = await this.aidServiceService.deleteAidService(id);
        return ApiResponse.success("Service deleted successfully", res);
    }

    @Get("seed")
    async seedAidServices(){
        const res = await this.aidServiceService.seedAidServices();
        return ApiResponse.success("services seeded successfully", res);
    }

    @Get("/:aidServiceId")
    async getAidService(
        @Param("aidServiceId", new ParseIntPipe()) aidServiceId: number
    ){
        const res = await this.aidServiceService.getAidService(aidServiceId);
        return ApiResponse.success("Aid service fetched successfully", res);
    }
}
