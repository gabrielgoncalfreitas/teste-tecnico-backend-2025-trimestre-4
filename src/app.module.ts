import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaService } from './services/prisma.service';
import { CepCrawlCreateHandler } from './handlers/cep.crawl.create.handler';
import { CepCrawlCreateController } from './controllers/cep.crawl.create.controller';
import { CepCrawlGetHandler } from './handlers/cep.crawl.get.handler';
import { CepCrawlGetController } from './controllers/cep.crawl.get.controller';
import { CepCrawlResultsHandler } from './handlers/cep.crawl.results.handler';
import { CepCrawlResultsController } from './controllers/cep.crawl.results.controller';
import { SqsService } from './services/sqs.service';
import { ViaCepService } from './services/viacep.service';
import { CrawlWorker } from './workers/crawl.worker';
import { HealthController } from './controllers/health.controller';

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
    CepCrawlCreateHandler,
    CepCrawlGetHandler,
    CepCrawlResultsHandler,
    SqsService,
    ViaCepService,
    CrawlWorker,
  ],
})
export class AppModule {}
