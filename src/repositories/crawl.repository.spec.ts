import { Test, TestingModule } from '@nestjs/testing';
import { CrawlRepository } from './crawl.repository';
import { PrismaService } from '../services/prisma.service';
import { CrawlStatusEnum, CrawResultStatusEnum } from 'generated/prisma';

describe('CrawlRepository', () => {
  let repository: CrawlRepository;
  let prisma: jest.Mocked<PrismaService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CrawlRepository,
        {
          provide: PrismaService,
          useValue: {
            crawl: {
              create: jest.fn(),
              findUnique: jest.fn(),
              update: jest.fn(),
            },
            crawl_result: {
              createMany: jest.fn(),
              create: jest.fn(),
              findMany: jest.fn(),
              count: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    repository = module.get(CrawlRepository);
    prisma = module.get(PrismaService);
  });

  it('should create a crawl', async () => {
    const data = {
      cep_start: '0',
      cep_end: '1',
      total_ceps: 2,
      status: CrawlStatusEnum.PENDING,
    };
    await repository.create(data);
    expect(prisma.crawl.create).toHaveBeenCalledWith({ data });
  });

  it('should findById', async () => {
    await repository.findById('id1');
    expect(prisma.crawl.findUnique).toHaveBeenCalledWith({
      where: { id: 'id1' },
    });
  });

  it('should update a crawl', async () => {
    const data = { status: CrawlStatusEnum.FINISHED };
    await repository.update('id1', data);
    expect(prisma.crawl.update).toHaveBeenCalledWith({
      where: { id: 'id1' },
      data,
    });
  });

  it('should updateWithSelect', async () => {
    const data = { status: CrawlStatusEnum.FINISHED };
    const select = { id: true };
    await repository.updateWithSelect('id1', data, select);
    expect(prisma.crawl.update).toHaveBeenCalledWith({
      where: { id: 'id1' },
      data,
      select,
    });
  });

  it('should createResults', async () => {
    const results = [{ cep: '1', status: 'SUCCESS' as any }];
    await repository.createResults(results as any);
    expect(prisma.crawl_result.createMany).toHaveBeenCalledWith({
      data: results,
    });
  });

  it('should createSingleResult', async () => {
    const data = {
      crawl_id: 'c1',
      cep: '1',
      status: CrawResultStatusEnum.SUCCESS,
    };
    await repository.createSingleResult(data);
    expect(prisma.crawl_result.create).toHaveBeenCalledWith({ data });
  });

  describe('findResults', () => {
    it('should find results without filters', async () => {
      await repository.findResults('c1', 0, 10);
      expect(prisma.crawl_result.findMany).toHaveBeenCalledWith({
        where: { crawl_id: 'c1' },
        skip: 0,
        take: 10,
        orderBy: { created_at: 'asc' },
      });
    });

    it('should find results with status filter', async () => {
      await repository.findResults('c1', 0, 10, {
        status: CrawResultStatusEnum.SUCCESS,
      });
      expect(prisma.crawl_result.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: CrawResultStatusEnum.SUCCESS,
          }),
        }),
      );
    });

    it('should find results with search query q', async () => {
      await repository.findResults('c1', 0, 10, { q: '010' });
      expect(prisma.crawl_result.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: expect.arrayContaining([
              { cep: { contains: '010', mode: 'insensitive' } },
            ]),
          }),
        }),
      );
    });

    it('should find results with matching_ceps', async () => {
      await repository.findResults('c1', 0, 10, {
        matching_ceps: ['01001000'],
      });
      expect(prisma.crawl_result.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: expect.arrayContaining([{ cep: { in: ['01001000'] } }]),
          }),
        }),
      );
    });
  });

  describe('countResults', () => {
    it('should count results without filters', async () => {
      await repository.countResults('c1');
      expect(prisma.crawl_result.count).toHaveBeenCalledWith({
        where: { crawl_id: 'c1' },
      });
    });

    it('should count results with search query q', async () => {
      await repository.countResults('c1', { q: '010' });
      expect(prisma.crawl_result.count).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: expect.arrayContaining([
              { cep: { contains: '010', mode: 'insensitive' } },
            ]),
          }),
        }),
      );
    });
  });
});
