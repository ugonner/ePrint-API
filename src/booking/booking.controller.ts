import { Body, Controller, Get, Param, ParseIntPipe, Post, Put, Query, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { BookingService } from './booking.service';
import { JwtGuard } from '../shared/guards/jwt.guards';
import { User } from '../shared/guards/decorators/user.decorator';
import { BookingDTO, CreateBookingDTO, QueryBookingDTO, UpdateBookinDTO, UpdateBookingProcessedMediaFilesDTO } from './dtos/booking.dto';
import { ApiResponse } from '../shared/helpers/apiresponse';

@ApiTags("booking")
@Controller('booking')
export class BookingController {
    constructor(
        private bookingService: BookingService
    ){}

    @UseGuards(JwtGuard)
    @Post()
    async createBooking(
        @User("userId") userId: string,
        @Body() payload: CreateBookingDTO
    ){
        const res = await this.bookingService.createBooking(payload, userId);
        return ApiResponse.success("Booking created successfully", res);
    }
    @UseGuards(JwtGuard)
    @Put("/:bookingId/provider/confirm")
    async confirmBookingByProvider(
        @User("userId") userId: string,
        @Param("bookingId", new ParseIntPipe()) bookingId: number 
    ){
        const res = await this.bookingService.confirmBookingService(userId, bookingId, {isProvider: true});
        return ApiResponse.success("Booking confirmed successfully", res);
    }
    @UseGuards(JwtGuard)
    @Put("/:bookingId/user/confirm")
    async confirmBookingByUser(
        @User("userId") userId: string,
        @Param("bookingId", new ParseIntPipe()) bookingId: number 
    ){
        const res = await this.bookingService.confirmBookingService(userId, bookingId, {isUser: true});
        return ApiResponse.success("Booking confirmed successfully", res);
    }

     @UseGuards(JwtGuard)
    @Put("/:bookingId/processed")
    async updateBookingProcessedFiles(
        @Body() payload: UpdateBookingProcessedMediaFilesDTO,
        @User("userId") userId: string,
        @Param("bookingId", new ParseIntPipe()) bookingId: number 
    ){
        const res = await this.bookingService.updateBookingProcessedFiles(bookingId, payload, userId);
        return ApiResponse.success("Booking updated successfully", res);
    }

  
     @UseGuards(JwtGuard)
    @Put("/:bookingId")
    async updateBooking(
        @Body() payload: UpdateBookinDTO,
        @User("userId") userId: string,
        @Param("bookingId", new ParseIntPipe()) bookingId: number 
    ){
        const res = await this.bookingService.updateBooking(userId, bookingId, payload);
        return ApiResponse.success("Booking updated successfully", res);
    }

  


    @Get()
    async getBookings(
        @Query() payload: QueryBookingDTO
    ){
        const res = await this.bookingService.getBookings(payload);
        return ApiResponse.success("bookings fetched successfully", res);
    }

    @Get("/:id")
    async getBooking(
        @Param("id", new ParseIntPipe()) id: number
    ){
        const res = await this.bookingService.getBooking(id);
        return ApiResponse.success("booking fetched successfully", res);
    }


}
