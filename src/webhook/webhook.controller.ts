// src/webhook/webhook.controller.ts

import { Controller, Post, Body, Headers, BadRequestException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

@Controller('webhook')
export class WebhookController {
  private readonly logger = new Logger(WebhookController.name);
  private readonly webhookSecret: string;

  constructor(private configService: ConfigService) {
    this.webhookSecret = this.configService.get<string>('CLOUDFLARE_API_TOKEN') || '';
  }

  @Post('')
  handleCloudflareWebhook(@Body() body: any, @Headers('x-cf-stream-signature') signature: string) {
    this.logger.log(`Received Cloudflare webhook: ${JSON.stringify(body)}`);

    if (this.webhookSecret) {
      if (!signature) {
        throw new BadRequestException('Missing signature header');
      }

      const computedSignature = crypto
        .createHmac('sha256', this.webhookSecret)
        .update(JSON.stringify(body))
        .digest('hex');

      if (computedSignature !== signature) {
        throw new BadRequestException('Invalid signature');
      }
    }

    // จัดการกับข้อมูล webhook
    if (body.status === 'ready') {
      this.logger.log(`Transcoding completed for video ID: ${body.result.uid}`);
      // คุณสามารถเพิ่มโค้ดที่นี่ เช่น อัปเดตฐานข้อมูล หรือแจ้งผู้ใช้
    }

    return { status: 'ok' };
  }
}
