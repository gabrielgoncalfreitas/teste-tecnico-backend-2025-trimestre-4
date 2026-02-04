import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CrawlModule } from './crawl.module';
import { HealthController } from './controllers/health.controller';

@Module({
  imports: [
    ConfigModule.forRoot({
      envFilePath: '.env',
      isGlobal: true,
    }),
    CrawlModule,
  ],
  controllers: [HealthController],
  providers: [],
})
export class AppModule {}
