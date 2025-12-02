import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { ReviewService } from './review.service';
import { JwtGuard } from '../shared/guards/jwt.guards';
import { User } from '../shared/guards/decorators/user.decorator';
import { QueryReviewAndReportDTO, ReviewAndRatingDTO } from '../shared/dtos/review.dto';
import { ApiResponse } from '../shared/helpers/apiresponse';
import { ApiTags } from '@nestjs/swagger';

@ApiTags("review")
@Controller('review')
export class ReviewController {
    constructor(
        private reviewService: ReviewService
    ){}

    @Post()
    @UseGuards(JwtGuard)
    async createReview(
        @User("userId") userId: string,
        @Body() payload: ReviewAndRatingDTO
    ){
        const res = await this.reviewService.createRating(payload, userId);
        return ApiResponse.success("review created successfully", res);
    }

    @Get()
    async getReviews(
        @Query() payload: QueryReviewAndReportDTO
    ){
        const res = await this.reviewService.getReviews(payload);
        return ApiResponse.success("reviews fetched successfully", res);
    }
}
