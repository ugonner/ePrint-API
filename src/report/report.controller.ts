import { Body, Controller, Get, Param, ParseIntPipe, Post, Put, Query, UseGuards } from '@nestjs/common';

import { JwtGuard } from '../shared/guards/jwt.guards';
import { User } from '../shared/guards/decorators/user.decorator';
import { QueryReviewAndReportDTO, ReviewAndRatingDTO, UpdateReportDTO } from '../shared/dtos/review.dto';
import { ApiResponse } from '../shared/helpers/apiresponse';
import { ReportService } from './report.service';
import { ApiTags } from '@nestjs/swagger';
import { ReportCommentDTO, ResolveReportDTO } from './dtos/report.sto';
import { QueryRequestDTO } from '../shared/dtos/query-request.dto';

@ApiTags("report")
@Controller('report')
export class ReportController {
    constructor(
        private reportService: ReportService
    ){}

    @Post()
    @UseGuards(JwtGuard)
    async createReview(
        @User("userId") userId: string,
        @Body() payload: ReviewAndRatingDTO
    ){
        const res = await this.reportService.createReport(payload, userId);
        return ApiResponse.success("review created successfully", res);
    }

    @Put("update")
    @UseGuards(JwtGuard)
    async commentReport(
        @Body() payload: UpdateReportDTO,
        @User("userId") userId: string
    ){
        const res = await this.reportService.updateReport(payload, userId);
        return ApiResponse.success("Report commented successfully", res)
    }

    @Post("/:reportId/comment")
    @UseGuards(JwtGuard)
    async commentReportComment(
        @Body() payload: ReportCommentDTO,
        @User("userId") userId: string,
        @Param("reportId", new ParseIntPipe()) reportId: number
    ){
        const res = await this.reportService.commentReport(reportId, userId, payload);
        return ApiResponse.success("Report comment recorded", res)
    }

    @Put("/:reportId/resolve")
    @UseGuards(JwtGuard)
    async resolveReportComment(
        @Body() payload: ResolveReportDTO,
        @User("userId") userId: string,
        @Param("reportId", new ParseIntPipe()) reportId: number
    ){
        const res = await this.reportService.resolveReport(reportId, userId, payload);
        return ApiResponse.success("Repprt resolutionrecorded", res)
    }

    @Get()
    async getReports(
        @Query() payload: QueryReviewAndReportDTO
    ){
        const res = await this.reportService.getReports(payload);
        return ApiResponse.success("reports fetched successfully", res);
    }

    @Get("/comment/:reportId")
    async getReportComment(
        @Param("reportId", new ParseIntPipe()) reportId: number,
        @Query() payload: QueryRequestDTO
    ){
        const res = await this.reportService.getReportComments(reportId, payload)
        return ApiResponse.success("Report comments fetched successfully", res);
    }

    @Get("/:reportId")
    async getReport(
        @Param("reportId", new ParseIntPipe()) reportId: number,
    ){
        const res = await this.reportService.getReport(reportId)
        return ApiResponse.success("Report fetched successfully", res);
    }
}
