import { Module } from '@nestjs/common';
import { PepecoinController } from './pepecoin.controller';
import { PepecoinService } from './pepecoin.service';

@Module({
  controllers: [PepecoinController],
  providers: [PepecoinService],
  exports: [PepecoinService],
})
export class PepecoinModule {}
