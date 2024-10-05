import { Module } from '@nestjs/common';
import { VideoController } from './video.controller';
import { VideoService } from './video.service';
import { CloudflareStreamModule } from '../cloudflare-stream/cloudflare-stream.module';

@Module({
  imports: [CloudflareStreamModule],
  controllers: [VideoController],
  providers: [VideoService],
})
export class VideoModule {}
