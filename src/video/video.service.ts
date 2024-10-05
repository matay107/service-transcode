// src/video/video.service.ts

import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosRequestConfig } from 'axios';

@Injectable()
export class VideoService {
  private readonly accountId: string;
  private readonly apiToken: string;
  private readonly code: string;

  constructor(private configService: ConfigService) {
    this.accountId = this.configService.get<string>('CLOUDFLARE_ACCOUNT_ID');
    this.apiToken = this.configService.get<string>('CLOUDFLARE_API_TOKEN');
    this.code = this.configService.get<string>('CLOUDFLARE_CUSTOMER_CODE');

  }


  async getSignedUrl(videoId: string): Promise<string> {

    var signed_url_restrictions = {
      "exp": Math.floor(Date.now() / 1000) + (12 * 60 * 60), // การจำกัดเวลาในการเข้าถึง 12 ชั่วโมง
      "downloadable": false, // ปิดการดาวน์โหลด
      "accessRules": [
        {
          "type": "ip.geoip.country", // ใช้การบล็อกตามประเทศ
          "country": ["TH"], // บล็อกการเข้าถึงจากประเทศไทย
          "action": "block" // บล็อกการเข้าถึง
        }
      ]
    };

    const url = `https://api.cloudflare.com/client/v4/accounts/${this.accountId}/stream/${videoId}/token`;

    const config: AxiosRequestConfig = {
      headers: {
        Authorization: `Bearer ${this.apiToken}`
      }
    };


    try {
      const response = await axios.post(url,signed_url_restrictions,config);
      console.log(response.data)
      const { token } = response.data.result;

      // สร้างลิงก์สำหรับเล่นวิดีโอ
      const videoUrl = `https://customer-${this.code}.cloudflarestream.com/${videoId}/manifest/video.m3u8?token=${token}`;
      console.log(videoUrl)
      return `${videoUrl}/manifest/video.m3u8`;
    } catch (error) {
      throw new Error('Failed to generate signed URL');
    }
  }
}
