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

  async findResults(
    crawlId: string,
    skip: number,
    take: number,
    filters?: {
      cep_start?: string;
      cep_end?: string;
      status?: CrawResultStatusEnum;
      q?: string;
      matching_ceps?: string[];
    },
  ) {
    const where: Prisma.crawl_resultWhereInput = { crawl_id: crawlId };

    if (filters?.status) {
      where.status = filters.status;
    }

    if (filters?.cep_start || filters?.cep_end) {
      where.cep = {};
      if (filters.cep_start) where.cep.gte = filters.cep_start;
      if (filters.cep_end) where.cep.lte = filters.cep_end;
    }

    if (filters?.q || filters?.matching_ceps) {
      const q = filters.q;
      where.OR = [];
      if (q) {
        where.OR.push({ cep: { contains: q, mode: 'insensitive' } });
      }
      if (filters.matching_ceps?.length) {
        where.OR.push({ cep: { in: filters.matching_ceps } });
      }
    }

    return this.prisma.crawl_result.findMany({
      where,
      skip,
      take,
      orderBy: { created_at: 'asc' },
    });
  }

  async countResults(
    crawlId: string,
    filters?: {
      cep_start?: string;
      cep_end?: string;
      status?: CrawResultStatusEnum;
      q?: string;
      matching_ceps?: string[];
    },
  ) {
    const where: Prisma.crawl_resultWhereInput = { crawl_id: crawlId };

    if (filters?.status) {
      where.status = filters.status;
    }

    if (filters?.cep_start || filters?.cep_end) {
      where.cep = {};
      if (filters.cep_start) where.cep.gte = filters.cep_start;
      if (filters.cep_end) where.cep.lte = filters.cep_end;
    }

    if (filters?.q || filters?.matching_ceps) {
      const q = filters.q;
      where.OR = [];
      if (q) {
        where.OR.push({ cep: { contains: q, mode: 'insensitive' } });
      }
      if (filters.matching_ceps?.length) {
        where.OR.push({ cep: { in: filters.matching_ceps } });
      }
    }

    return this.prisma.crawl_result.count({
      where,
    });
  }
}
