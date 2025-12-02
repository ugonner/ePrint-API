import {
  Body,
  Controller,
  Delete,
  HttpStatus,
  Post,
  UploadedFile,
  UploadedFiles,
  UseFilters,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { FileUploadService } from './file-upload.service';
import { ApiResponse } from '../shared/helpers/apiresponse';
import { AllExceptionFilter } from '../shared/interceptors/all-exceptions.filter';
import { IAttachment } from './interfaces/typings';
import { File as MulterFile} from "multer";

@Controller('file-upload')
@UseFilters(AllExceptionFilter)
export class FileUploadController {
  constructor(private fileUploadService: FileUploadService) {}

  @Post()
  @UseInterceptors(FileInterceptor('file'))
  async createAudioFile(@UploadedFile() file: MulterFile) {
    let res: IAttachment;

    if (/cloudinary/i.test(process.env.STORAGE_PLATFORM))
      res =
        await this.fileUploadService.uploadMessageAttachmentToCloudinary(file);
    else
      res = await this.fileUploadService.uploadMessageAttachmentToLocal(file);

    return ApiResponse.success('file uploaded successfuly', res);
  }
  @Post('multiple')
  @UseInterceptors(FilesInterceptor('files'))
  async addMultipleFiles(@UploadedFiles() files: MulterFile[]) {
    let res: IAttachment[];
    if (!files || files.length === 0)
      return ApiResponse.fail('No files uploaded', HttpStatus.BAD_REQUEST);
    res = await Promise.all(
      files.map((file) => {
        if (/cloudinary/i.test(process.env.STORAGE_PLATFORM))
          return this.fileUploadService.uploadMessageAttachmentToCloudinary(
            file,
          );
        else return this.fileUploadService.uploadMessageAttachmentToLocal(file);
      }),
    );

    return ApiResponse.success('file uploaded successfuly', res);
  }

  @Delete("multiple")
  async deleteFiles(@Body() payload: {fileUrls: string[]}){
    const res = await this.fileUploadService.deleteFilesLocal(payload.fileUrls);
    return ApiResponse.success("files deleted successfully", res)
  }
  
  @Delete()
  async deleteFile(@Body() payload: {fileUrl: string}){
    const res = await this.fileUploadService.deleteFileLocal(payload.fileUrl);
    return ApiResponse.success("file deleted successfully", res)
  }
}
