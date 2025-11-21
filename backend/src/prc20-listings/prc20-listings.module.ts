import { Module } from '@nestjs/common';
import { Prc20ListingsController } from './prc20-listings.controller';
import { Prc20ListingsService } from './prc20-listings.service';
import { DatabaseModule } from '../database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [Prc20ListingsController],
  providers: [Prc20ListingsService],
  exports: [Prc20ListingsService],
})
export class Prc20ListingsModule {}
