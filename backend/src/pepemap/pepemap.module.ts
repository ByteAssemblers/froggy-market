import { Module } from '@nestjs/common';
import { PepemapController } from './pepemap.controller';
import { PepemapService } from './pepemap.service';
import { PepecoinModule } from '../pepecoin/pepecoin.module';

@Module({
  imports: [PepecoinModule],
  controllers: [PepemapController],
  providers: [PepemapService],
  exports: [PepemapService],
})
export class PepemapModule {}
