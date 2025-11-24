import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { WebsocketGateway } from './websocket/websocket.gateway';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DatabaseModule } from './database/database.module';
import { CollectionsModule } from './collections/collections.module';
import { ListingsModule } from './listings/listings.module';
import { PepecoinModule } from './pepecoin/pepecoin.module';
import { PepemapModule } from './pepemap/pepemap.module';
import { PepemapListingsModule } from './pepemap-listings/pepemap-listings.module';
import { Prc20ListingsModule } from './prc20-listings/prc20-listings.module';
import { InformationsModule } from './informations/informations.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath:
        process.env.NODE_ENV === 'production' ? '.env.production' : '.env.local',
    }),
    DatabaseModule,
    CollectionsModule,
    ListingsModule,
    PepecoinModule,
    PepemapModule,
    PepemapListingsModule,
    Prc20ListingsModule,
    InformationsModule,
  ],
  controllers: [AppController],
  providers: [AppService, WebsocketGateway],
  exports: [],
})
export class AppModule {}
