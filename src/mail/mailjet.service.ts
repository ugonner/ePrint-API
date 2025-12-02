import { Injectable } from '@nestjs/common';
import * as fs from 'fs';
import * as handlebars from 'handlebars';
import * as path from 'path';
import { MailDTO } from './dtos/mail.dto';

//import * as Mailjet from 'node-mailjet';

const Mailjet = require('node-mailjet');

@Injectable()
export class MailjetService {
  private readonly mailjet;

  constructor() {
    this.mailjet = Mailjet.apiConnect(
      process.env.MAILJET_API_KEY,
      process.env.MAILJET_API_SECRET
    );
  }

  // Compile Handlebars template
  private compileTemplate(templatePath: string, data: Record<string, any>): string {
    const templateSource = fs.readFileSync(templatePath, 'utf8');
    const template = handlebars.compile(templateSource);
    return template(data);
  }

  // Send email with a Handlebars template
  async sendEmail(
    dto: MailDTO
  ): Promise<any> {
    try {
      const {to, subject, context, template} = dto;
      
      const templatePath = path.join(__dirname,"..", '../templates', template || "generals/general.hbs");
      if(context.entries){
        context.entriesData = Object.entries(context.entries)
      };

      const htmlBody = this.compileTemplate(templatePath, context);

      const request = await this.mailjet.post('send', { version: 'v3.1' }).request({
        Messages: [
          {
            From: {
              Email: process.env.MAIL_FROM_EMAIL || "care@skinbeautycosmetics1st.com",
              Name: process.env.MAIL_FROM_NAME || "Skin Beauty Cosmetics",
            },
            To: to.map((email) => ({
              Email: email,
              Name: email.split('@')[0], // Extract name from email as a placeholder
            })),
            Subject: subject,
            HTMLPart: htmlBody,
          },
        ],
      });

      return request.body;
    } catch (error) {
      throw new Error(`Failed to send email: ${error.message}`);
    }
  }
}
