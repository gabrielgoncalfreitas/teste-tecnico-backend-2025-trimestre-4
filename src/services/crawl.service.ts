import { Injectable } from '@nestjs/common';
import {
  CrawlStatusEnum,
  CrawResultStatusEnum,
  Prisma,
} from 'generated/prisma';
import { CrawlRepository } from '../repositories/crawl.repository';
import { CepRepository } from '../repositories/cep.repository';

@Injectable()
export class CrawlService {
  constructor(
    private readonly repository: CrawlRepository,
    private readonly cepRepository: CepRepository,
  ) {}

  async createCrawl(data: {
    cep_start: string;
    cep_end: string;
    total_ceps: number;
  }) {
    return this.repository.create({
      ...data,
      status: CrawlStatusEnum.PENDING,
    });
  }

  async findById(id: string) {
    return this.repository.findById(id);
  }

  async processBulkCachedResults(
    crawlId: string,
    cachedCeps: { cep: string; found: boolean }[],
    isCompleteRange: boolean,
  ) {
    const resultsToCreate = cachedCeps.map((c) => ({
      crawl_id: crawlId,
      cep: c.cep,
      status: c.found
        ? CrawResultStatusEnum.SUCCESS
        : CrawResultStatusEnum.ERROR,
      data: c.found ? c : undefined,
      error_message: c.found ? null : 'CEP not found (cached)',
    }));

    await this.repository.createResults(resultsToCreate);

    const successCount = cachedCeps.filter((c) => c.found).length;
    const errorCount = cachedCeps.length - successCount;

    return this.repository.update(crawlId, {
      processed_ceps: { increment: cachedCeps.length },
      success_ceps: { increment: successCount },
      failed_ceps: { increment: errorCount },
      status: isCompleteRange
        ? CrawlStatusEnum.FINISHED
        : CrawlStatusEnum.RUNNING,
    });
  }

  async saveSingleResult(params: {
    crawlId: string;
    cep: string;
    status: CrawResultStatusEnum;
    data?: Prisma.InputJsonValue;
    errorMessage?: string;
  }) {
    const { crawlId, cep, status, data, errorMessage } = params;

    await this.repository.createSingleResult({
      crawl_id: crawlId,
      cep,
      status,
      data: data ?? undefined,
      error_message: errorMessage,
    });

    const updateData: Prisma.crawlUpdateInput = {
      processed_ceps: { increment: 1 },
    };

    if (status === CrawResultStatusEnum.SUCCESS) {
      updateData.success_ceps = { increment: 1 };
    } else {
      updateData.failed_ceps = { increment: 1 };
    }

    const updatedCrawl = await this.repository.updateWithSelect(
      crawlId,
      updateData,
      { total_ceps: true, processed_ceps: true },
    );

    const finalStatus =
      updatedCrawl.processed_ceps >= updatedCrawl.total_ceps
        ? CrawlStatusEnum.FINISHED
        : CrawlStatusEnum.RUNNING;

    await this.repository.update(crawlId, { status: finalStatus });

    return updatedCrawl;
  }

  private async getMatchingCeps(q?: string): Promise<string[] | undefined> {
    if (!q) return undefined;
    const matching = await this.cepRepository.searchCeps(q);
    return matching.map((m) => m.cep);
  }

  async findResults(
    crawlId: string,
    skip: number,
    take: number,
    filters?: {
      cep_start?: string;
      cep_end?: string;
      status?: CrawResultStatusEnum;
      q?: string;
    },
  ) {
    const matching_ceps = await this.getMatchingCeps(filters?.q);
    return this.repository.findResults(crawlId, skip, take, {
      ...filters,
      matching_ceps,
    });
  }

  async countResults(
    crawlId: string,
    filters?: {
      cep_start?: string;
      cep_end?: string;
      status?: CrawResultStatusEnum;
      q?: string;
    },
  ) {
    const matching_ceps = await this.getMatchingCeps(filters?.q);
    return this.repository.countResults(crawlId, {
      ...filters,
      matching_ceps,
    });
  }

  async findResultsCount(
    crawlId: string,
    filters?: {
      cep_start?: string;
      cep_end?: string;
      status?: CrawResultStatusEnum;
      q?: string;
    },
  ) {
    return this.countResults(crawlId, filters);
  }
}
