import { MailerService } from '@nestjs-modules/mailer';
import { Injectable } from '@nestjs/common';
import { MailDTO } from './dtos/mail.dto';
import { MailjetService } from './mailjet.service';
import * as path from "path";

@Injectable()
export class MailService {
    constructor(private readonly mailerService: MailerService,

      private mailjetService: MailjetService
    ) {}

  async sendEmail(
    dto: MailDTO
  ) {
    try {

      //await this.mailjetService.sendEmail(dto);
      const {to, subject, context, template} = dto;
        if(context.entries){
        context.entriesData = Object.entries(context.entries)
      };
      
      await this.mailerService.sendMail({
        to,
        subject,
        template: template || "generals/general.hbs", // e.g., './welcome' -> './templates/welcome.hbs'
        context, // Data to be injected into the template
      });
      console.log('Email sent successfully!');
    } catch (error) {
      console.error('Error sending email:', error);
      throw error;
    }
  }

}
