import { Module } from '@nestjs/common';
import { PepemapListingsController } from './pepemap-listings.controller';
import { PepemapListingsService } from './pepemap-listings.service';
import { DatabaseModule } from '../database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [PepemapListingsController],
  providers: [PepemapListingsService],
  exports: [PepemapListingsService],
})
export class PepemapListingsModule {}
