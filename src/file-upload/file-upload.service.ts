import { Injectable } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import {File as MulterFile} from "multer";

import * as toStream from 'buffer-to-stream';
import { UploadApiResponse, v2 } from 'cloudinary';
import { IAttachment } from './interfaces/typings';

@Injectable()
export class FileUploadService {

  private awsS3Bucket = process.env.AWS_BUCKET || 'ugonnatalk';

  private cloudinaryService = v2; 

  constructor(){
    const cloudinaryApiKey =
      process.env.NODE_ENV === 'production'
        ? process.env.CLOUDINARY_API_KEY
        : process.env.CLOUDINARY_API_KEY;
    const cloudinaryApiKeySecret =
      process.env.NODE_ENV === 'production'
        ? process.env.CLOUDINARY_API_SECRET
        : process.env.CLOUDINARY_API_SECRET;

    const cloudinaryCloudName = process.env.CLOUDINARY_CLOUD_NAME;
    const awsRegion = process.env.AWS_REGION || 'eu-north-1';
    const cloudinaryV2 = v2;
    this.cloudinaryService.config({
      api_key: cloudinaryApiKey,
      api_secret: cloudinaryApiKeySecret,
      cloud_name: cloudinaryCloudName
    });
    
  }
  async uploadMessageAttachmentToLocal(file: MulterFile): Promise<IAttachment> {
    console.log("file name", file.originalname);
    //const fileExtension = file.originalname.split(".")[-1];
     

    const attachmentUrl = `/products/${Date.now()}.${file.originalname.replace(" ", "_")}`;
    const filePath = path.join(__dirname, '..', '..', 'public', attachmentUrl);
    fs.writeFileSync(filePath, file.buffer);
    await new Promise((resolve, reject) => {
      fs.writeFile(filePath, file.buffer, (err) => {
        if (err) reject(err);
        resolve(attachmentUrl);
      });
    });
    const attachmentData: IAttachment = {
      attachmentUrl: `${process.env.BASE_URL}${attachmentUrl}`,
      attachmentType: file.mimetype as any,
    };
    return attachmentData;
  }

  
  async uploadMessageAttachmentToCloudinary(file: MulterFile): Promise<IAttachment> {
    
    

    const fileStream = toStream(file.buffer);
    const attachmentType = file.mimetype;
    const fileExtension = file.originalname.replace(" ", "_");
    const key = `${Date.now()}-${attachmentType}.${fileExtension}`;

    const uploadStreamPromise: UploadApiResponse = await new Promise((resolve, reject) => {
      const uploadStream = this.cloudinaryService.uploader.upload_stream({
        resource_type: "auto"
      }, (err, result) => {
        if(err) reject(err);
        resolve(result)
      });
      fileStream.pipe(uploadStream);
    });
    return {
      attachmentType,
      attachmentUrl: uploadStreamPromise.secure_url || uploadStreamPromise.url 
    }
}

  async deletEeFileCloudinary(fileUrl: string) {
    if(!fileUrl) return;
    const fileName = fileUrl.split("/").pop();
    const publicId = fileName ? fileName.split(".")[0] : null;
    if(!publicId) return;
    return await this.cloudinaryService.uploader.destroy(publicId);
  }
  
  async deleteFileLocal(fileUrl: string) {
    if(!fileUrl) return;
    if(process.env.NODE_ENV === "production") return this.deletEeFileCloudinary(fileUrl); 

    const filePath = fileUrl?.replace(`${process.env.BASE_URL}`, "");
    const fullPath = path.join(__dirname, '..', '..', 'public', filePath);
    const fileExists = fs.existsSync(fullPath);
    if(!fileExists) return;
    fs.unlink(fullPath, (err) => {
      if(err) {
        console.log("Error deleting file", err.message);
        return;
      };
    })
  }
  
  async deleteFilesLocal(fileUrls: string[]): Promise<boolean> {
    const fullFilePaths = [];
    const unlinkPromise = (filename: fs.PathLike) => {
      return new Promise((resolve, reject) => {
        fs.unlink(filename, (err) => {
          if(err) return reject(err);
          resolve(true);
        })
      })
    };

    await Promise.allSettled(
      fileUrls.map((fileUrl) => {
        const attachmentUrl = fileUrl.split("/products/")[1];
      const filePath = path.join(__dirname, '..', '..', 'public', "products", attachmentUrl);
      return unlinkPromise(filePath);
      })
    );
    return true;
  }
}
