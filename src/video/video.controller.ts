import {
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
  BadRequestException,
  Res,
  Get,
  Param,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { CloudflareStreamService } from '../cloudflare-stream/cloudflare-stream.service';
import { join } from 'path';
import { Response } from 'express';
import { VideoService } from './video.service';
import * as tus from 'tus-js-client';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

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
  async uploadVideo(@UploadedFile() file: Express.Multer.File) {
    console.time('uploadTime');
    if (!file) {
      throw new BadRequestException('File is not provided');
    }
    console.log(file);
    // return;
    const fileBuffer = file.buffer;
    const tempFilePath = path.join(os.tmpdir(), 'tempfile.mp4');
    fs.writeFileSync(tempFilePath, fileBuffer);

    // สร้าง stream จากไฟล์ที่เราเขียน
    const fileUpload = fs.createReadStream(tempFilePath);
    const size = fs.statSync(tempFilePath).size;
    let mediaId = '';

    const options = {
      endpoint: `https://api.cloudflare.com/client/v4/accounts/${this.accountId}/stream`,
      headers: {
        Authorization: `Bearer ${this.apiToken}`,
      },
      chunkSize: 100 * 1024 * 1024, // ใช้ chunk ขนาด 200 MB
      retryDelays: [0, 3000, 5000, 10000, 20000], // เวลารอเมื่อเกิดความล้มเหลวในการอัปโหลด
      metadata: {
        name: file.originalname,
        filetype: file.mimetype,
      },
      uploadSize: size,
      onError: function (error) {
        throw error;
      },
      onProgress: function (bytesUploaded, bytesTotal) {
        const percentage = ((bytesUploaded / bytesTotal) * 100).toFixed(2);
        console.log(bytesUploaded, bytesTotal, percentage + '%');
      },
      onSuccess: function () {
        console.log('Upload finished');
        console.timeEnd('uploadTime');
        // ลบไฟล์ชั่วคราวเมื่อการอัปโหลดสำเร็จ
        fs.unlinkSync(tempFilePath);
      },
      onAfterResponse: function (req, res): Promise<void> {
        return new Promise((resolve) => {
          const mediaIdHeader = res.getHeader('stream-media-id');
          if (mediaIdHeader) {
            mediaId = mediaIdHeader;
          }

          resolve();
        });
      },
    };

    const upload = new tus.Upload(fileUpload, options);
    upload.start();

    console.log(upload);

    return;

    const uploadResult = await this.cloudflareStreamService.uploadVideo(file);
    console.log(uploadResult);

    return {
      message: 'Video uploaded successfully',
      videoId: uploadResult.result.uid,
      playbackUrl: uploadResult.result.playback.hls,
    };
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
