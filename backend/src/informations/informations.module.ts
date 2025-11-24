import { Module } from '@nestjs/common';
import { InformationsController } from './informations.controller';
import { InformationsService } from './informations.service';
import { DatabaseModule } from '../database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [InformationsController],
  providers: [InformationsService],
  exports: [InformationsService],
})
export class InformationsModule {}
