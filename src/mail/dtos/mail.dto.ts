import { IsEmail, IsOptional, IsString } from "class-validator";

export class MailDTO {
    @IsEmail({}, {each: true})
    to: string[];

    @IsString()
    subject: string;

    @IsString()
    @IsOptional()
    template?: string;
    
    @IsOptional()
    context?: ITemplateData & Record<string, unknown>;
}

export class ITemplateData {

    @IsString()
    @IsOptional()
    message?: string;

    @IsString()
    @IsOptional()
    receiverName?: string;
    

    @IsOptional()
    entries?: {[key: string]: unknown}
}