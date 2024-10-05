import { Module } from '@nestjs/common';
import { CloudflareStreamService } from './cloudflare-stream.service';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [ConfigModule],
  providers: [CloudflareStreamService],
  exports: [CloudflareStreamService],
})
export class CloudflareStreamModule {}
