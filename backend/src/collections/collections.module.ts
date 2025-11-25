import { Module } from '@nestjs/common';
import { CollectionsService } from './collections.service';
import { CollectionsController } from './collections.controller';
import { DatabaseService } from '../database/database.service';

@Module({
  imports: [],
  providers: [CollectionsService, DatabaseService],
  controllers: [CollectionsController],
})
export class CollectionsModule {}
