import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from 'src/services/prisma.service';
import { CepCrawlCreateDTO } from 'src/dtos/cep.crawl.create.dto';
import { CepCrawlCreateResponse } from 'src/responses/cep.crawl.create.response';
import { SqsService } from 'src/services/sqs.service';
import { CrawlStatusEnum, CrawResultStatusEnum } from 'generated/prisma';

@Injectable()
export class CepCrawlCreateHandler {
  private readonly logger = new Logger(CepCrawlCreateHandler.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly sqsService: SqsService,
  ) {}

  async main({ body }: { body: CepCrawlCreateDTO }) {
    const start = parseInt(body.cep_start);
    const end = parseInt(body.cep_end);

    if (isNaN(start) || isNaN(end)) {
      throw new BadRequestException('Invalid CEP format');
    }

    if (start > end) {
      throw new BadRequestException(
        'cep_start must be less than or equal to cep_end',
      );
    }

    // Arbitrary limit check if needed, e.g., max 1000 items
    if (end - start > 10000) {
      throw new BadRequestException('Range too large (max 10000)');
    }

    const totalCeps = end - start + 1;

    const crawl = await this.prisma.crawl.create({
      data: {
        cep_start: body.cep_start,
        cep_end: body.cep_end,
        status: CrawlStatusEnum.PENDING,
        total_ceps: totalCeps,
      },
    });

    // 2. Bulk Lookup in Cache
    const allCepsInRange: string[] = [];
    for (let i = start; i <= end; i++) {
      allCepsInRange.push(i.toString().padStart(8, '0'));
    }

    const cachedCeps = await this.prisma.cep.findMany({
      where: { cep: { in: allCepsInRange } },
    });

    const cachedMap = new Map(cachedCeps.map((c) => [c.cep, c]));
    const missingCeps = allCepsInRange.filter((c) => !cachedMap.has(c));

    // 3. Process Cached Results Immediately
    if (cachedCeps.length > 0) {
      this.logger.log(
        `Found ${cachedCeps.length} cached CEPs for crawl ${crawl.id}. Processing instantly.`,
      );

      const resultsToCreate = cachedCeps.map((c) => ({
        crawl_id: crawl.id,
        cep: c.cep,
        status: c.found
          ? CrawResultStatusEnum.SUCCESS
          : CrawResultStatusEnum.ERROR,
        data: c.found ? (c as any) : undefined,
        error_message: c.found ? null : 'CEP not found (cached)',
      }));

      // Create results in bulk
      await this.prisma.crawl_result.createMany({
        data: resultsToCreate,
      });

      const successCount = cachedCeps.filter((c) => c.found).length;
      const errorCount = cachedCeps.length - successCount;

      await this.prisma.crawl.update({
        where: { id: crawl.id },
        data: {
          processed_ceps: { increment: cachedCeps.length },
          success_ceps: { increment: successCount },
          failed_ceps: { increment: errorCount },
          status:
            cachedCeps.length === totalCeps
              ? CrawlStatusEnum.FINISHED
              : CrawlStatusEnum.RUNNING,
        },
      });
    }

    // 4. Enqueue Only Missing CEPs
    if (missingCeps.length > 0) {
      const cepsToEnqueue = missingCeps.map((cep) => ({
        crawl_id: crawl.id,
        cep,
      }));

      this.logger.log(
        `Enqueueing ${cepsToEnqueue.length} missing CEPs for crawl ${crawl.id}`,
      );
      await this.sqsService.sendMessageBatch(cepsToEnqueue);
    } else if (cachedCeps.length === totalCeps) {
      this.logger.log(`All CEPs for crawl ${crawl.id} were found in cache.`);
    }

    // Refetch crawl for the final response to ensure accurate counts
    const finalCrawl = await this.prisma.crawl.findUnique({
      where: { id: crawl.id },
    });

    if (!finalCrawl) {
      throw new Error(`Crawl ${crawl.id} not found after processing cache.`);
    }

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
}
