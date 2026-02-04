import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaService } from './services/prisma.service';
import { SqsService } from './services/sqs.service';
import { CrawlService } from './services/crawl.service';
import { CepCacheService } from './services/cep-cache.service';
import { AddressService } from './services/address.service';
import { ViaCepProvider } from './providers/viacep.provider';
import { OpenCepProvider } from './providers/opencep.provider';
import { CepCrawlCreateHandler } from './handlers/cep.crawl.create.handler';
import { CepCrawlGetHandler } from './handlers/cep.crawl.get.handler';
import { CepCrawlResultsHandler } from './handlers/cep.crawl.results.handler';
import { CepCrawlCreateController } from './controllers/cep.crawl.create.controller';
import { CepCrawlGetController } from './controllers/cep.crawl.get.controller';
import { CepCrawlResultsController } from './controllers/cep.crawl.results.controller';
import { HealthController } from './controllers/health.controller';
import { CrawlWorker } from './workers/crawl.worker';

@Module({
  imports: [
    ConfigModule.forRoot({
      envFilePath: '.env',
      isGlobal: true,
    }),
  ],
  controllers: [
    CepCrawlCreateController,
    CepCrawlGetController,
    CepCrawlResultsController,
    HealthController,
  ],
  providers: [
    PrismaService,
    SqsService,
    CrawlService,
    CepCacheService,
    AddressService,
    ViaCepProvider,
    OpenCepProvider,
    CepCrawlCreateHandler,
    CepCrawlGetHandler,
    CepCrawlResultsHandler,
    CrawlWorker,
  ],
})
export class AppModule {}
