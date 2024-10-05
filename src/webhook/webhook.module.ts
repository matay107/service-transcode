// src/webhook/webhook.module.ts

import { Module } from '@nestjs/common';
import { WebhookController } from './webhook.controller';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [ConfigModule],
  controllers: [WebhookController],
})
export class WebhookModule {}
