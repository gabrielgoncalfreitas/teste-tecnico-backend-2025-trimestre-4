import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/services/prisma.service';
import { CepCrawlGetResponse } from 'src/responses/cep.crawl.get.response';
import { CepCrawlNotFoundResponse } from 'src/responses/cep.crawl.not-found.response';

@Injectable()
export class CepCrawlGetHandler {
  constructor(private readonly prisma: PrismaService) {}

  async main({ crawl_id }: { crawl_id: string }) {
    const crawl = await this.prisma.crawl.findUnique({
      where: { id: crawl_id },
    });

    if (!crawl) {
      return new CepCrawlNotFoundResponse();
    }

    return new CepCrawlGetResponse({
      id: crawl.id,
      cep_end: crawl.cep_end,
      cep_start: crawl.cep_start,
      status: crawl.status,
      total: crawl.total_ceps,
      processed: crawl.processed_ceps,
      success: crawl.success_ceps,
      errors: crawl.failed_ceps,
    });
  }
}
