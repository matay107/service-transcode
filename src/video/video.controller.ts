import {
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
  BadRequestException,
  HttpException,
  HttpStatus,
  Res,
  Get,
  Body,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { CloudflareStreamService } from '../cloudflare-stream/cloudflare-stream.service';
import { join } from 'path';
import { Response } from 'express';
import { VideoService } from './video.service';
import { UploadResponseDto } from './dto/upload-response.dto';
import { ServiceType } from '../enums/ServiceTypeEnum';
import { ConfigService } from '@nestjs/config';

@Controller('video')
export class VideoController {
  private readonly accountId: string;
  private readonly apiToken: string;

  constructor(
    private readonly cloudflareStreamService: CloudflareStreamService,
    private readonly videoService: VideoService,
    private configService: ConfigService,
  ) {
    this.accountId = this.configService.get<string>('CLOUDFLARE_ACCOUNT_ID');
    this.apiToken = this.configService.get<string>('CLOUDFLARE_API_TOKEN');
  }

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  async uploadVideo(@UploadedFile() file: Express.Multer.File,@Body() body: any): Promise<UploadResponseDto> { 
    console.log(body);
    console.log(file);

    if (!file) {
      throw new BadRequestException('File is not provided');
    }

 
    try {

      if(body.service === ServiceType.CLOUDFLARE){
      const uploadResult = await this.cloudflareStreamService.uploadTusProtocolVideo(file);
      return {
        message: uploadResult.message,
        videoId: uploadResult.videoId
      };
    }

    } catch (error) {
      throw new HttpException(
        'Video upload failed',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

  }

  @Get('verify-token')
  async verifyToken(): Promise<any> {
    try {
      const result = await this.cloudflareStreamService.getToken();
      return result;
    } catch (error) {
      throw new HttpException(
        'Token verification failed',
        HttpStatus.UNAUTHORIZED,
      );
    }
  }

  async getSignedVideoUrl(videoId: string) {
  
    const signedUrl = await this.videoService.getSignedUrl(videoId);
    return { signedUrl };
  }

  @Get('play')
  async renderVideoPlayer(@Res() res: Response) {
    const signedUrl = await this.getSignedVideoUrl(
      '45a8c40f9af24ac3a83217fbfa87dc50',
    );
    res.sendFile(join(process.cwd(), 'public', 'video-player.html'));
  }
}
