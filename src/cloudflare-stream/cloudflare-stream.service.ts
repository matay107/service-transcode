import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosRequestConfig } from 'axios';
import * as FormData from 'form-data';
import * as tus from 'tus-js-client';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { UploadResponseDto } from './dto/upload-response.dto';

@Injectable()
export class CloudflareStreamService {
  private readonly logger = new Logger(CloudflareStreamService.name);
  private readonly accountId: string;
  private readonly apiToken: string;

  constructor(private configService: ConfigService) {
    this.accountId = this.configService.get<string>('CLOUDFLARE_ACCOUNT_ID');
    this.apiToken = this.configService.get<string>('CLOUDFLARE_API_TOKEN');

    if (!this.accountId || !this.apiToken) {
      this.logger.error('Cloudflare Stream configuration is missing.');
      throw new Error('Cloudflare Stream configuration is missing.');
    }

  }

  async uploadTusProtocolVideo(
    file: Express.Multer.File,
  ): Promise<UploadResponseDto> {
    console.time('uploadTime');
    this.logger.log(`Starting upload for file: ${file.originalname}`);

    // สร้างชื่อไฟล์ชั่วคราวที่ไม่ซ้ำกัน
    const tempFileName = `${Date.now()}-${file.originalname}`;
    const tempFilePath = path.join(os.tmpdir(), tempFileName);

    try {
      // เขียนข้อมูลไฟล์ไปยังไฟล์ชั่วคราวแบบอะซิงโครนัส
      await fs.promises.writeFile(tempFilePath, file.buffer);
      this.logger.log(`Temporary file created at: ${tempFilePath}`);

      const fileUpload = fs.createReadStream(tempFilePath);
      const { size } = await fs.promises.stat(tempFilePath);
      this.logger.log(`File size: ${size} bytes`);

      const uploadEndpoint = `https://api.cloudflare.com/client/v4/accounts/${this.accountId}/stream`;

      let mediaId = '';

      const uploadPromise = new Promise<{ message: string; videoId: string }>(
        (resolve, reject) => {
          const upload = new tus.Upload(fileUpload, {
            endpoint: uploadEndpoint,
            headers: {
              Authorization: `Bearer ${this.apiToken}`,
            },
            chunkSize: 100 * 1024 * 1024, // ขนาด chunk 100 MB
            retryDelays: [0, 3000, 5000, 10000, 20000],
            metadata: {
              name: file.originalname,
              filetype: file.mimetype,
            },
            uploadSize: size,
            onError: (error) => {
              this.logger.error('Upload failed:', error);
              // ลบไฟล์ชั่วคราวในกรณีเกิดข้อผิดพลาด
              fs.promises
                .unlink(tempFilePath)
                .then(() => this.logger.log('Temporary file deleted.'))
                .catch((unlinkErr) =>
                  this.logger.error('Failed to delete temp file:', unlinkErr),
                );
              reject(error);
            },
            onProgress: (bytesUploaded, bytesTotal) => {
              const percentage = ((bytesUploaded / bytesTotal) * 100).toFixed(2);
              this.logger.log(
                `Uploaded ${bytesUploaded} of ${bytesTotal} bytes (${percentage}%)`,
              );
            },
            onSuccess: () => {
              this.logger.log('Upload finished');
              console.timeEnd('uploadTime');
              // ลบไฟล์ชั่วคราวเมื่อการอัปโหลดสำเร็จ
              fs.promises
                .unlink(tempFilePath)
                .then(() => this.logger.log('Temporary file deleted.'))
                .catch((unlinkErr) =>
                  this.logger.error('Failed to delete temp file:', unlinkErr),
                );
              resolve({
                message: 'Video uploaded successfully',
                videoId: mediaId,
              });
            },
            onAfterResponse: (req, res) => {
              const mediaIdHeader = res.getHeader('stream-media-id');
              if (mediaIdHeader) {
                mediaId = mediaIdHeader as string;
                this.logger.log(`Media ID received: ${mediaId}`);
              }
            },
          });

          upload.start();
        },
      );

      return await uploadPromise;
    } catch (error) {
      this.logger.error('Error during uploadTusProtocolVideo:', error);
 
      try {
        await fs.promises.unlink(tempFilePath);
        this.logger.log('Temporary file deleted after error.');
      } catch (unlinkError) {
        this.logger.error('Failed to delete temp file:', unlinkError);
      }
      throw error;
    }
  }

  /**
   * Verifies the API token by making a request to Cloudflare's token verification endpoint.
   * @returns The result of the token verification.
   */
  async getToken(): Promise<any> {
    const urlCheckToken = 'https://api.cloudflare.com/client/v4/user/tokens/verify';

    const config: AxiosRequestConfig = {
      headers: {
        Authorization: `Bearer ${this.apiToken}`,
      },
    };

    try {
      const response = await axios.get(urlCheckToken, config);
      this.logger.log('Token verification successful.');
      return response.data;
    } catch (error) {
      this.logger.error('Error verifying token:', error);
      throw error;
    }
  }


  
//   async uploadVideo(file: Express.Multer.File): Promise<any> {
//     const form = new FormData();
//     form.append('file', file.buffer, {
//       filename: file.originalname,
//       contentType: file.mimetype,
//     });


//     const config: AxiosRequestConfig = {
//       headers: {
//         Authorization: `Bearer ${this.apiToken}`,
//         ...form.getHeaders(),
//       }
//     };

//   const urlCheckToken = 'https://api.cloudflare.com/client/v4/user/tokens/verify';
//   const responseCheckToken = await axios.get(urlCheckToken, config);

//   console.log(responseCheckToken.data)
  
//     const url = `https://api.cloudflare.com/client/v4/accounts/${this.accountId}/stream`;

//     this.logger.debug(`Uploading video to URL: ${url}`);
//     this.logger.debug(`File metadata: ${JSON.stringify({
//       filename: file.originalname,
//       contentType: file.mimetype,
//       size: file.size,
//     })}`);

//     try {
//       console.time('uploadVideo');
//       this.logger.debug('Sending request to Cloudflare Stream API...');
//       const response = await axios.post(url, form, config);
//       console.log(response.data)
//       this.logger.log(`Video uploaded to Cloudflare Stream successfully: ${response.data.result.uid}`);
//       console.timeEnd('uploadVideo');
//       return response.data;

//     } catch (error: any) {
//       // Log ข้อมูลเพิ่มเติม
//       if (error.response) {
//         this.logger.error(`Cloudflare API Response: ${error.response.status} - ${JSON.stringify(error.response.data)}`);
//       } else {
//         this.logger.error(`Cloudflare API Error: ${error.message}`);
//       }
//       throw new InternalServerErrorException('Failed to upload video to Cloudflare Stream');
//     }
// }




}
