import { Injectable } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { CrawlStatusEnum, CrawResultStatusEnum } from 'generated/prisma';

@Injectable()
export class CrawlService {
  constructor(private readonly prisma: PrismaService) {}

  async createCrawl(data: {
    cep_start: string;
    cep_end: string;
    total_ceps: number;
  }) {
    return this.prisma.crawl.create({
      data: {
        ...data,
        status: CrawlStatusEnum.PENDING,
      },
    });
  }

  async findById(id: string) {
    return this.prisma.crawl.findUnique({
      where: { id },
    });
  }

  async processBulkCachedResults(
    crawlId: string,
    cachedCeps: any[],
    isCompleteRange: boolean,
  ) {
    const resultsToCreate = cachedCeps.map((c) => ({
      crawl_id: crawlId,
      cep: c.cep,
      status: c.found
        ? CrawResultStatusEnum.SUCCESS
        : CrawResultStatusEnum.ERROR,
      data: c.found ? (c as any) : undefined,
      error_message: c.found ? null : 'CEP not found (cached)',
    }));

    await this.prisma.crawl_result.createMany({
      data: resultsToCreate,
    });

    const successCount = cachedCeps.filter((c) => c.found).length;
    const errorCount = cachedCeps.length - successCount;

    return this.prisma.crawl.update({
      where: { id: crawlId },
      data: {
        processed_ceps: { increment: cachedCeps.length },
        success_ceps: { increment: successCount },
        failed_ceps: { increment: errorCount },
        status: isCompleteRange
          ? CrawlStatusEnum.FINISHED
          : CrawlStatusEnum.RUNNING,
      },
    });
  }

  async saveSingleResult(params: {
    crawlId: string;
    cep: string;
    status: CrawResultStatusEnum;
    data?: any;
    errorMessage?: string;
  }) {
    const { crawlId, cep, status, data, errorMessage } = params;

    await this.prisma.crawl_result.create({
      data: {
        crawl_id: crawlId,
        cep,
        status,
        data: (data as any) ?? undefined,
        error_message: errorMessage,
      },
    });

    const updateData: any = {
      processed_ceps: { increment: 1 },
    };

    if (status === CrawResultStatusEnum.SUCCESS) {
      updateData.success_ceps = { increment: 1 };
    } else {
      updateData.failed_ceps = { increment: 1 };
    }

    const updatedCrawl = await this.prisma.crawl.update({
      where: { id: crawlId },
      data: updateData,
      select: { total_ceps: true, processed_ceps: true },
    });

    const finalStatus =
      updatedCrawl.processed_ceps >= updatedCrawl.total_ceps
        ? CrawlStatusEnum.FINISHED
        : CrawlStatusEnum.RUNNING;

    await this.prisma.crawl.update({
      where: { id: crawlId },
      data: { status: finalStatus },
    });

    return updatedCrawl;
  }

  async findResults(crawlId: string, skip: number, take: number) {
    return this.prisma.crawl_result.findMany({
      where: { crawl_id: crawlId },
      skip,
      take,
      orderBy: { created_at: 'asc' },
    });
  }

  async countResults(crawlId: string) {
    return this.prisma.crawl_result.count({
      where: { crawl_id: crawlId },
    });
  }
}
