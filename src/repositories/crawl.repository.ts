import { Injectable } from '@nestjs/common';
import { PrismaService } from '../services/prisma.service';
import {
  CrawlStatusEnum,
  CrawResultStatusEnum,
  Prisma,
} from 'generated/prisma';

@Injectable()
export class CrawlRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: {
    cep_start: string;
    cep_end: string;
    total_ceps: number;
    status: CrawlStatusEnum;
  }) {
    return this.prisma.crawl.create({ data });
  }

  async findById(id: string) {
    return this.prisma.crawl.findUnique({
      where: { id },
    });
  }

  async update(id: string, data: Prisma.crawlUpdateInput) {
    return this.prisma.crawl.update({
      where: { id },
      data,
    });
  }

  async updateWithSelect(
    id: string,
    data: Prisma.crawlUpdateInput,
    select: Prisma.crawlSelect,
  ) {
    return this.prisma.crawl.update({
      where: { id },
      data,
      select,
    });
  }

  async createResults(data: Prisma.crawl_resultCreateManyInput[]) {
    return this.prisma.crawl_result.createMany({
      data,
    });
  }

  async createSingleResult(data: {
    crawl_id: string;
    cep: string;
    status: CrawResultStatusEnum;
    data?: any;
    error_message?: string;
  }) {
    return this.prisma.crawl_result.create({ data });
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
