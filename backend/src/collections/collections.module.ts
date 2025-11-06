import { Module } from '@nestjs/common';
import { CollectionsService } from './collections.service';
import { CollectionsController } from './collections.controller';
import { PrismaService } from '../prisma/prisma.service';

@Module({
  imports: [],
  providers: [CollectionsService, PrismaService],
  controllers: [CollectionsController],
})
export class CollectionsModule {}
