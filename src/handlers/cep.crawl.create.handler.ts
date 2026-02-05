import { Injectable, Logger } from '@nestjs/common';
import { CepCrawlCreateDTO } from 'src/dtos/cep.crawl.create.dto';
import { CepCrawlCreateResponse } from 'src/responses/cep.crawl.create.response';
import { SqsService } from 'src/services/sqs.service';
import { CrawlService } from 'src/services/crawl.service';
import { CepCacheService } from 'src/services/cep-cache.service';
import { CepCrawlNotFoundResponse } from 'src/responses/cep.crawl.not-found.response';

@Injectable()
export class CepCrawlCreateHandler {
  private readonly logger = new Logger(CepCrawlCreateHandler.name);

  constructor(
    private readonly crawlService: CrawlService,
    private readonly cepCacheService: CepCacheService,
    private readonly sqsService: SqsService,
  ) {}

  async main({ body }: { body: CepCrawlCreateDTO }) {
    const start = parseInt(body.cep_start);
    const end = parseInt(body.cep_end);

    const totalCeps = end - start + 1;
    const crawl = await this.crawlService.createCrawl({
      cep_start: body.cep_start,
      cep_end: body.cep_end,
      total_ceps: totalCeps,
    });

    const allCepsInRange = this.generateCepRange(start, end);
    const cachedCeps = await this.cepCacheService.findMany(allCepsInRange);

    const cachedMap = new Map(cachedCeps.map((c) => [c.cep, c]));
    const missingCeps = allCepsInRange.filter((c) => !cachedMap.has(c));

    if (cachedCeps.length > 0) {
      this.logger.log(
        `Found ${cachedCeps.length} cached CEPs for crawl ${crawl.id}.`,
      );
      await this.crawlService.processBulkCachedResults(
        crawl.id,
        cachedCeps,
        cachedCeps.length === totalCeps,
      );
    }

    if (missingCeps.length > 0) {
      await this.enqueueMissingCeps(crawl.id, missingCeps);
    }

    const finalCrawl = await this.crawlService.findById(crawl.id);
    if (!finalCrawl) return new CepCrawlNotFoundResponse();

    return new CepCrawlCreateResponse({
      id: finalCrawl.id,
      cep_end: finalCrawl.cep_end,
      cep_start: finalCrawl.cep_start,
      status: finalCrawl.status,
      total: finalCrawl.total_ceps,
      processed: finalCrawl.processed_ceps,
      success: finalCrawl.success_ceps,
      errors: finalCrawl.failed_ceps,
    });
  }

  private generateCepRange(start: number, end: number): string[] {
    const range: string[] = [];
    for (let i = start; i <= end; i++) {
      range.push(i.toString().padStart(8, '0'));
    }
    return range;
  }

  private async enqueueMissingCeps(crawlId: string, missingCeps: string[]) {
    const cepsToEnqueue = missingCeps.map((cep) => ({
      crawlId,
      cep,
    }));
    this.logger.log(
      `Enqueueing ${cepsToEnqueue.length} missing CEPs for crawl ${crawlId}`,
    );
    await this.sqsService.sendMessageBatch(cepsToEnqueue);
  }
}
