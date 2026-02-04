import { Module } from '@nestjs/common';
import { PrismaService } from './services/prisma.service';
import { SqsService } from './services/sqs.service';
import { CrawlService } from './services/crawl.service';
import { CepCacheService } from './services/cep-cache.service';
import { AddressService } from './services/address.service';
import { ViaCepProvider } from './services/address/viacep.provider';
import { OpenCepProvider } from './services/address/opencep.provider';
import { CepCrawlCreateHandler } from './handlers/cep.crawl.create.handler';
import { CepCrawlGetHandler } from './handlers/cep.crawl.get.handler';
import { CepCrawlResultsHandler } from './handlers/cep.crawl.results.handler';
import { CepCrawlCreateController } from './controllers/cep.crawl.create.controller';
import { CepCrawlGetController } from './controllers/cep.crawl.get.controller';
import { CepCrawlResultsController } from './controllers/cep.crawl.results.controller';
import { CrawlWorker } from './workers/crawl.worker';

@Module({
  imports: [],
  controllers: [
    CepCrawlCreateController,
    CepCrawlGetController,
    CepCrawlResultsController,
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
  exports: [CrawlService, CepCacheService, AddressService, SqsService],
})
export class CrawlModule {}
