import {
  Injectable,
  BadRequestException,
  NotFoundException,
  UnauthorizedException,
  Logger,
  InternalServerErrorException,
  ForbiddenException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, QueryRunner, Repository, UpdateDateColumn } from 'typeorm';
import { Auth } from '../entities/auth.entity';
import * as bcrypt from 'bcryptjs';

import { IsPhoneNumber, validate } from 'class-validator';
import { UserProfileDTO } from '../shared/dtos/user.dto';
import { DBUtils } from '../shared/helpers/db';
import { NotificationService } from '../notifiction/notification.service';
import { AuthDTO, OtpAuthDTO, QueryAuthDTO } from '../shared/dtos/auth.dto';
import { Profile } from '../entities/user.entity';
import { IQueryResult } from '../shared/interfaces/api-response.interface';
import { exec } from 'child_process';
import * as os from 'os';
import { ProfileWallet } from '../entities/user-wallet.entity';
import { NotificationContext } from '../notifiction/enums/notification.enum';
import { MailService } from '../mail/mail.service';
import { Role } from '../entities/role.entity';
import { RoleDTO } from '../shared/dtos/role.dto';
import { error } from 'console';
import { AidServiceService } from '../aid-service/aid-service.service';
import { AidServiceProfileApplicationDTO } from '../aid-service/dtos/aid-service.dto';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(Auth) private authRepository: Repository<Auth>,
    private jwtService: JwtService,
    @InjectDataSource()
    private dataSource: DataSource,
    private mailService: MailService,
    private aidServiceService: AidServiceService
  ) {}

  private logger: Logger = new Logger(AuthService.name);
  generateOTP(): number {
    return Number(`${Math.random()}`.substr(2, 6));
  }

  async createAccount(dto: UserProfileDTO): Promise<Auth> {
    let newAuth: Auth;
    let errorData: unknown;
    const queryRunner: QueryRunner = this.dataSource.createQueryRunner();
    await queryRunner.startTransaction();
    try {
      await this.validateDto(dto);
      const { email, firstName, lastName, gender, disabilityType, ...rest } =
        dto;

      const userExist = await queryRunner.manager.findOneBy(Auth, [
        { email: email?.toLocaleLowerCase() },
        { phoneNumber: dto.phoneNumber },
      ]);
      if (userExist)
        throw new BadRequestException('Email already / Phone number exists');

      const payload: Partial<Auth> = {
        ...rest,
        firstName,
        lastName,
        isVerified: true, // TODO: Remove
      };
      if(email) payload.email = email.toLowerCase();
     
      if(dto.phoneNumber) payload.phoneNumber = dto.phoneNumber;
      payload.otpTime = new Date();
      payload.userId = await DBUtils.generateUniqueID(
        this.authRepository,
        'userId',
        8,
        firstName,
      );
      payload.otp = this.generateOTP();
      const auth = queryRunner.manager.create(Auth, payload);
      await queryRunner.manager.save(Auth, auth);
     
      const profile = queryRunner.manager.create(Profile, {
        userId: auth.userId,
        email: email?.toLowerCase(),
        phoneNumber: auth.phoneNumber,
        firstName,
        lastName,
        gender,
        disabilityType,
        account: auth,
      });
      const newUserProfile = await queryRunner.manager.save(Profile, profile);
      const walletData = queryRunner.manager.create(ProfileWallet, { profile });
      const wallet = await queryRunner.manager.save(ProfileWallet, walletData);

      profile.wallet = wallet;
      await queryRunner.manager.save(Profile, profile);

      auth.profile = newUserProfile;

      await queryRunner.manager.save(Auth, auth);
      if(email) this.mailService.sendEmail({
        to: [auth.email],
        subject: 'Account Creation Activation',
        context: {
          receiverName: auth.firstName,
          entries: {
            otp: payload.otp,
            name: firstName,
          },
        },
      })
      .catch((err) => console.log("Error sending signup OTP out mail", err.message))

      await queryRunner.commitTransaction();
      newAuth = auth;
    } catch (error) {
      errorData = error;
      await queryRunner.rollbackTransaction();
    } finally {
      await queryRunner.release();
      if (errorData) throw errorData;
      return newAuth;
    }
  }

  private async validateDto(registerDto: UserProfileDTO): Promise<void> {
    const errors = await validate(registerDto);
    if (errors.length > 0) {
      throw new BadRequestException(errors);
    }
  }

  async login(dto: AuthDTO, values: { userAgent: string; ipAddress: string }) {
    const user = await this.authRepository.findOne({
      where: [
        { email: dto.email?.toLowerCase() },
        { phoneNumber: dto.phoneNumber },
      ],
      relations: ['profile', "role"],
    });
    if (!user) throw new NotFoundException('Invalid credentials');

    if (!user.isVerified) throw new BadRequestException('Account not verified');

    const isPasswordMatch = await bcrypt.compare(dto.password, user.password);
    if (!isPasswordMatch) throw new BadRequestException('Invalid credentials');

    const { accessToken, refreshToken } =
      await this.generateRefreshAndAccessToken({
        id: user.id,
        userId: user.userId,
        role: user.role
      }, values);

    const userData = {
      ...user,
      token: accessToken,
      refreshToken,
    };
    delete(userData.password)
    return userData;
  }

  async generateRefreshAndAccessToken(
    user: Partial<Auth>,
    refreshData: { userAgent: string; ipAddress: string },
  ) {
    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(
        {
          user,
        },
        {
          secret: process.env.JWT_ACCESS_SECRET,
          expiresIn: process.env.JWT_ACCESS_TOKEN_EXPIRATION,
        },
      ),
      this.jwtService.signAsync(
        {
          userId: user.userId,
          ...refreshData,
        },
        {
          secret: process.env.JWT_REFRESH_SECRET,
          expiresIn: '7d',
        },
      ),
    ]);
    return { accessToken, refreshToken };
  }

  //verify account
  async verifyAccount(
    dto: OtpAuthDTO,
    values: { userAgent: string; ipAddress: string },
  ) {
    const auth = await this.authRepository.findOneBy([{ email: dto.email, phoneNumber: dto.email }]);
    if (!auth)
      throw new NotFoundException(
        'No account found, you can re-register again',
      );
    if (auth.isVerified)
      throw new BadRequestException('aCCOUNT ALREADY verified, sign in');

    const otpExpireTime = new Date(auth.otpTime).getTime() + 10 * 60 * 1000;
    if (otpExpireTime < Date.now()) {
      throw new ForbiddenException('Verification code has expired');
    }
    auth.isVerified = true;
    await this.authRepository.save(auth);
    this.mailService.sendEmail({
      to: [auth.email],
      subject: 'Account Verified',
      context: {
        receiverName: auth.firstName,
        message:
          'Your Account has been verified succesfully, Go ahead and login',
      },
    })
    .catch((err) => console.log("Error sending account verification email", err.message))
    const { accessToken, refreshToken } =
      await this.generateRefreshAndAccessToken({
        id: auth.id,
        userId: auth.userId,
        role: auth.role
      }, values);

    return { token: accessToken, refresh: refreshToken };
  }

  //resend verification token
  async resendOtp(payload: OtpAuthDTO): Promise<OtpAuthDTO> {
    try {
      const auth = await this.authRepository.findOne({
        where: [{ email: payload.email },{phoneNumber: payload.email}],
        relations: ['profile'],
      });
      if (!auth) {
        throw new NotFoundException('Account not found');
      }
      
      const otp = Number(Math.random().toString().substr(2, 6));
      auth.otp = otp;
      auth.otpTime = new Date();
      await this.authRepository.save(
        auth
      );
      this.mailService.sendEmail({
        to: [auth.email],
        subject: 'OTP Sent',
        context: {
          receiverName: auth.firstName,

          message: `${auth.profile.firstName}, The below information is generated for your use, otp: ${otp}`,
          entries: { otp },
        },
      });
      return { email: payload.email, otp };
    } catch (error) {
      this.logger.error('Resend verification code failed', error.stack);
      throw new BadRequestException(
        error.message || 'Resend verification code failed',
      );
    }
  }

  //reset password link
  async requestResetPassword(payload: OtpAuthDTO): Promise<OtpAuthDTO> {
    const auth = await this.authRepository.findOne({
      where: [{ email: payload.email }, {phoneNumber: payload.email}],
      relations: ['profile'],
    });
    if (!auth) {
      throw new NotFoundException('Account not found');
    }
    if (!auth.isVerified) {
      throw new BadRequestException(
        'Account is not verified, kindly verify your account to proceed',
      );
    }

    const otp = Number(Math.random().toString().substr(2, 6));
    auth.otp = otp;
    auth.otpTime = new Date();
    await this.authRepository.save(
      auth
    );
    this.mailService.sendEmail({
      to: [payload.email],
      subject: 'Reset Password',

      context: {
        receiverName: auth.firstName,
        message: `Use ${otp} to reset your password`,
        entries: { otp },
      },
    });
    return {
      email: payload.email,
      otp,
    };
  }

  //reset password
  async resetPassword(payload: OtpAuthDTO) {
    const auth = await this.authRepository.findOneBy([{ email: payload.email }, {phoneNumber: payload.email}]);
    if (!auth) {
      throw new NotFoundException('Account not found or invalid token');
    }
    if (!auth.isVerified) {
      throw new BadRequestException('Verify your account to proceed');
    }

    if (payload.otp !== auth.otp) throw new BadRequestException('Invalid OTP');

    const otpExpireTime = new Date(auth.otpTime).getTime() + 10 * 60 * 1000;

    if (otpExpireTime < new Date().getTime()) {
      throw new UnauthorizedException('Verification code has expired');
    }
    const password = await bcrypt.hash(payload.password, 10);
    await this.authRepository.update(
      { otp: auth.otp },
      { password, otp: null },
    );
    this.mailService.sendEmail({
      to: [payload.email],
      subject: 'Password reset successful',
      context: {
        receiverName: auth.firstName,

        message: 'Your password was reset successfully',
      },
    });
    return 'Password reset done';
  }

  async getAuthUsers(dto: QueryAuthDTO): Promise<IQueryResult<Auth>> {
    const { page, limit, searchTerm, order } = dto;
    const queryPage = page ? Number(page) : 1;
    const queryLimit = limit ? Number(limit) : 10;
    const querOrder = order ? order : 'ASC';

    const queryBuilder = this.authRepository
      .createQueryBuilder('user')
      .leftJoinAndSelect(`user.aidServices`, `aidServices`);

    if (searchTerm) {
      const searchTermLowercase = searchTerm.toLowerCase();
      let whereClause = `LOWER("user"."email") LIKE '%${searchTermLowercase}%' `;
      ['firstName', 'lastName', 'phoneNumber'].forEach((field) => {
        whereClause += `OR LOWER("user"."${field}") LIKE '%${searchTermLowercase}%' `;
      });
      queryBuilder.where(whereClause);
    }
    queryBuilder.orderBy(`"user"."firstName"`, querOrder);
    if (page) queryBuilder.skip((queryPage - 1) * queryLimit).limit(queryLimit);
    const [data, total] = await queryBuilder.getManyAndCount();
    return { page: queryPage, limit: queryLimit, total, data };
  }
  async getIP() {
    const command = /win/i.test(os.platform()) ? 'ipconfig' : 'sudo ifconfig';
    const cmdRes = await new Promise((resolve, reject) => {
      exec(command, (err, stOut, stdErr) => {
        if (err) reject(err);
        resolve(stOut);
      });
    });
    console.log('cmdRes', cmdRes);
    const clientIpMatches = (cmdRes as string).match(
      /IPv4 Address. . . . . . . . . . . :\s\d+\.\d+\.\d+\.\d+/g,
    );
    if (!clientIpMatches) return '127.0.0.1';
    const clientIp = clientIpMatches[1] || clientIpMatches[0];
    return clientIp?.replace('IPv4 Address. . . . . . . . . . . : ', '').trim();
  }

  async createRole(dto: RoleDTO): Promise<Role> {
    let errorData: unknown;
    let savedRole: Role;
    const queryRunner = this.dataSource.createQueryRunner();
    try{
      await queryRunner.startTransaction();
      const {name, description} = dto;
      const roleExists = await queryRunner.manager.findOneBy(Role, {name: name.toLowerCase()});
      if(roleExists) throw new BadRequestException("Role already exists");
      const roledata = queryRunner.manager.create(Role, {...dto, name: name.toLowerCase()});
      const role = await queryRunner.manager.save(Role, roledata);
      await queryRunner.commitTransaction();
      savedRole = role;
    }catch(error){
      errorData = error;
      await queryRunner.rollbackTransaction();
    }finally{
      await queryRunner.release();
      if(errorData) throw errorData;
      return savedRole;
    }
  }

  async updateRole(roleId: number, dto: RoleDTO): Promise<Role> {
    let errorData: unknown;
    let savedRole: Role;
    const queryRunner = this.dataSource.createQueryRunner();
    try{
      await queryRunner.startTransaction();
      const roleExists = await queryRunner.manager.findOneBy(Role, {id: roleId});
      if(!roleExists) throw new BadRequestException("Role not found");
      const roledata = queryRunner.manager.create(Role, {...roleExists, ...dto});
      if(dto.name) roledata.name = dto.name.toLowerCase();

      const role = await queryRunner.manager.save(Role, roledata);
      await queryRunner.commitTransaction();
      savedRole = role;
    }catch(error){
      errorData = error;
      await queryRunner.rollbackTransaction();
    }finally{
      await queryRunner.release();
      if(errorData) throw errorData;
      return savedRole;
    }
  }

  
  async getRoles(): Promise<Role[]> {
    return await this.dataSource.getRepository(Role).findBy({});
  }
  
  async assignRole(userId: string, roleId: number): Promise<Auth> {
    let updatedAuth: Auth;
    let errorData: unknown;
    const queryRunner = this.dataSource.createQueryRunner();
    try{
      await queryRunner.startTransaction();
      const auth = await queryRunner.manager.findOneBy(Auth, {userId})
      if(!auth) throw new NotFoundException("Profile not found")

        const role = await queryRunner.manager.findOneBy(Role, {id: roleId})
    if(!role) throw new NotFoundException("Role not found");

    auth.role = role;

    const savedAuth = await queryRunner.manager.save(Auth, auth);
    await queryRunner.commitTransaction();
    updatedAuth = savedAuth;
  
      }catch(error){
      errorData = error;
      await queryRunner.rollbackTransaction();
    }finally{
      await queryRunner.release();
      if(errorData) throw errorData;
      return updatedAuth;
    }
  }

  async seedAdminProfile(): Promise<Auth>{
    let adminProfile: Auth;
    let errorData: unknown;
    const queryRunner = this.dataSource.createQueryRunner();

    try{
      await queryRunner.startTransaction();
      const authDto: UserProfileDTO = {
        email: process.env.OFFICIAL_PROFILE_EMAIL,
        phoneNumber: `${process.env.OFFICIAL_PROFILE_PHONE_NUMBER}`,
        password: "thanks123",
        firstName: "iDigiHub",
        lastName: "Official"
      };
      adminProfile = await this.createAccount(authDto);
      if(!adminProfile?.userId) throw new InternalServerErrorException("Admin profile not created");
      const roleDto: RoleDTO = {
        name: "SuperAdmin",
        description: "Handles superintending administrative duties and roles"
      };
      const adminRole = await this.createRole(roleDto);
      const assignRole = await this.assignRole(adminProfile.userId, adminRole.id);
      if(!assignRole?.id) throw new InternalServerErrorException("Unble to assign admin role");
      const dto: AidServiceProfileApplicationDTO = {
        locationAddress: {
          street: "Arom Junction",
          city: "Awka",
          locality: "Awka South",
          state: "Anambra",
          country: "Nigeria"
        },
        contactPhoneNumber: `${process.env.OFFICIAL_PROFILE_PHONE_NUMBER}`,
      }
      
      await this.aidServiceService.createOrUpdateAidServiceProfile(adminProfile.userId, dto)
      await queryRunner.commitTransaction();
    }catch(error){
      errorData = error;
      await queryRunner.rollbackTransaction();
    }finally{
      await queryRunner.release();
      if(errorData) throw errorData;
      return adminProfile;
    }
  }
}
