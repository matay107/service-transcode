import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosRequestConfig } from 'axios';
import * as FormData from 'form-data';

@Injectable()
export class CloudflareStreamService {
  private readonly logger = new Logger(CloudflareStreamService.name);
  private readonly accountId: string;
  private readonly apiToken: string;

  constructor(private configService: ConfigService) {
    this.accountId = this.configService.get<string>('CLOUDFLARE_ACCOUNT_ID');
    this.apiToken = this.configService.get<string>('CLOUDFLARE_API_TOKEN');

    if (!this.accountId) {
      throw new InternalServerErrorException('CLOUDFLARE_ACCOUNT_ID is not defined in environment variables');
    }

    if (!this.apiToken) {
      throw new InternalServerErrorException('CLOUDFLARE_API_TOKEN is not defined in environment variables');
    }

    this.logger.debug(`CLOUDFLARE_ACCOUNT_ID: ${this.accountId}`);

  }

  async uploadVideo(file: Express.Multer.File): Promise<any> {
    const form = new FormData();
    form.append('file', file.buffer, {
      filename: file.originalname,
      contentType: file.mimetype,
    });


    const config: AxiosRequestConfig = {
      headers: {
        Authorization: `Bearer ${this.apiToken}`,
        ...form.getHeaders(),
      }
    };

  const urlCheckToken = 'https://api.cloudflare.com/client/v4/user/tokens/verify';
  const responseCheckToken = await axios.get(urlCheckToken, config);

  console.log(responseCheckToken.data)
  
    const url = `https://api.cloudflare.com/client/v4/accounts/${this.accountId}/stream`;

    this.logger.debug(`Uploading video to URL: ${url}`);
    this.logger.debug(`File metadata: ${JSON.stringify({
      filename: file.originalname,
      contentType: file.mimetype,
      size: file.size,
    })}`);

    try {
      console.time('uploadVideo');
      this.logger.debug('Sending request to Cloudflare Stream API...');
      const response = await axios.post(url, form, config);
      console.log(response.data)
      this.logger.log(`Video uploaded to Cloudflare Stream successfully: ${response.data.result.uid}`);
      console.timeEnd('uploadVideo');
      return response.data;

    } catch (error: any) {
      // Log ข้อมูลเพิ่มเติม
      if (error.response) {
        this.logger.error(`Cloudflare API Response: ${error.response.status} - ${JSON.stringify(error.response.data)}`);
      } else {
        this.logger.error(`Cloudflare API Error: ${error.message}`);
      }
      throw new InternalServerErrorException('Failed to upload video to Cloudflare Stream');
    }
}




}
