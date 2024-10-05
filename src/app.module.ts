import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import { VideoModule } from './video/video.module';
import { CloudflareStreamModule } from './cloudflare-stream/cloudflare-stream.module';
import { WebhookModule } from './webhook/webhook.module';


@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true, // ทำให้ ConfigModule สามารถใช้งานได้ทั่วทั้งแอปพลิเคชัน
    }),
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', 'public'), 
    }),
    VideoModule,
    CloudflareStreamModule,
    WebhookModule, // เพิ่ม WebhookModule ใน imports ถ้าต้องการ
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
