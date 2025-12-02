import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthController } from './auth.controller';
import { Auth } from '../entities/auth.entity';
import { AuthService } from './auth.service';
import { UserModule } from 'src/user/user.module';
import { JwtModule } from '@nestjs/jwt';
import { NotificationModule } from '../notifiction/notification.module';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MailModule } from '../mail/mail.module';
import { AidServiceModule } from '../aid-service/aid-service.module';
@Module({
  imports: [
    JwtModule,
    NotificationModule,
    MailModule,
    TypeOrmModule.forFeature([Auth]),
    AidServiceModule
  ],
  controllers: [AuthController],
  providers: [AuthService],
  exports: [AuthService],
})
export class AuthModule {}
