import { Body, Controller, Get, Param, ParseIntPipe, Post, Put, Query, UseFilters, UseGuards } from '@nestjs/common';
import { UserService } from './user.service';
import { Profile } from '../entities/user.entity';
import { User } from '../shared/guards/decorators/user.decorator';
import { ApiResponse } from '../shared/helpers/apiresponse';
import { JwtGuard } from '../shared/guards/jwt.guards';
import { Auth } from '../entities/auth.entity';
import { QueryUserDTO, UpdateProfileDTO, UserProfileDTO } from '../shared/dtos/user.dto';
import { ApiTags } from '@nestjs/swagger';
import { AllExceptionFilter } from '../shared/interceptors/all-exceptions.filter';
import { ClusterDTO, ManageUserClustersDTO } from './dtos/cluster.dto';

@ApiTags("user")
@UseFilters(AllExceptionFilter)
@Controller('user')
export class UserController {
    constructor(
        private userService: UserService
    ){}

    @Put()
    //@UseGuards(JwtGuard)
    async updateUser(
        @Body() payload: UpdateProfileDTO,
        @User() user: Auth,
        @Query() queryPayload: {userId: string}
    ){
        const userId = queryPayload.userId || user?.userId;
        const res = await this.userService.updateUser(userId, payload);
        return ApiResponse.success("user updated successfully", res);
    }

    @Post("cluster")
    @UseGuards(JwtGuard)
    async createCluster(
        @Body() payload: ClusterDTO
    ){
        const res = await this.userService.createCluster(payload);
        return ApiResponse.success("cluster created successfully", res)
    }
    @Put("cluster/:id")
    @UseGuards(JwtGuard)
    async updateCluster(
        @Body() payload: ClusterDTO,
        @Param("id", new ParseIntPipe()) clusterId: number
    ){
        const res = await this.userService.updateCluster(clusterId, payload);
        return ApiResponse.success("cluster updated successfully", res)
    }
    @Post("/:userId/cluster/manage")
    @UseGuards(JwtGuard)
    async manageUserCluster(
        @Body() payload: ManageUserClustersDTO,
        @User("userId") userId: string,
        @Param("userId") paramUserId: string
    ){
        userId = paramUserId || userId;
        const res = await this.userService.manageUserClusters(userId, payload, payload.options);
        return ApiResponse.success("cluster updated successfully", res)
    }

    @Get("cluster")
    async getClusters(){
        const res = await this.userService.getClusters();
        return ApiResponse.success("clusters fetched successfully", res);
    }

    @Get()
    async getUsers(
        @Query() payload: QueryUserDTO
    ){
        const res = await this.userService.getUsers(payload);
        return ApiResponse.success("users fetched successfully", res);
    }

    @Get("/:userId")
    async getUser(
        @Param("userId") userId: string
    ){
        const res = await this.userService.getUser(userId);
        return ApiResponse.success("User fetched successfully", res);
    }
    
}
