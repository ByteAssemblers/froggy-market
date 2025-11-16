import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { WebsocketGateway } from './websocket/websocket.gateway';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DatabaseModule } from './database/database.module';
import { CollectionsModule } from './collections/collections.module';
import { ListingsModule } from './listings/listings.module';
import { PepecoinModule } from './pepecoin/pepecoin.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    DatabaseModule,
    CollectionsModule,
    ListingsModule,
    PepecoinModule,
  ],
  controllers: [AppController],
  providers: [AppService, WebsocketGateway],
  exports: [],
})
export class AppModule {}
