import { Test, TestingModule } from '@nestjs/testing';
import { CrawlService } from './crawl.service';
import { CrawlRepository } from '../repositories/crawl.repository';
import { CrawlStatusEnum, CrawResultStatusEnum } from 'generated/prisma';

describe('CrawlService', () => {
  let service: CrawlService;
  let repository: jest.Mocked<CrawlRepository>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CrawlService,
        {
          provide: CrawlRepository,
          useValue: {
            create: jest.fn(),
            findById: jest.fn(),
            update: jest.fn(),
            updateWithSelect: jest.fn(),
            createResults: jest.fn(),
            createSingleResult: jest.fn(),
            findResults: jest.fn(),
            countResults: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get(CrawlService);
    repository = module.get(CrawlRepository);
  });

  describe('createCrawl', () => {
    it('should create a crawl with PENDING status', async () => {
      const data = {
        cep_start: '01000000',
        cep_end: '01000010',
        total_ceps: 11,
      };
      await service.createCrawl(data);
      expect(repository.create).toHaveBeenCalledWith({
        ...data,
        status: CrawlStatusEnum.PENDING,
      });
    });
  });

  describe('processBulkCachedResults', () => {
    it('should set status to FINISHED if range is complete', async () => {
      const crawlId = 'c1';
      const cached = [{ cep: '01000000', found: true }];

      await service.processBulkCachedResults(crawlId, cached, true);

      expect(repository.createResults).toHaveBeenCalled();
      expect(repository.update).toHaveBeenCalledWith(
        crawlId,
        expect.objectContaining({
          status: CrawlStatusEnum.FINISHED,
        }),
      );
    });

    it('should set status to RUNNING if range is NOT complete', async () => {
      const crawlId = 'c1';
      const cached = [{ cep: '01000000', found: true }];

      await service.processBulkCachedResults(crawlId, cached, false);

      expect(repository.update).toHaveBeenCalledWith(
        crawlId,
        expect.objectContaining({
          status: CrawlStatusEnum.RUNNING,
        }),
      );
    });
  });

  describe('saveSingleResult', () => {
    it('should update status to FINISHED when all ceps are processed', async () => {
      const crawlId = 'c1';
      repository.updateWithSelect.mockResolvedValue({
        total_ceps: 10,
        processed_ceps: 10,
      } as any);

      await service.saveSingleResult({
        crawlId,
        cep: '01000009',
        status: CrawResultStatusEnum.SUCCESS,
      });

      expect(repository.update).toHaveBeenCalledWith(crawlId, {
        status: CrawlStatusEnum.FINISHED,
      });
    });

    it('should update status to RUNNING when NOT all ceps are processed', async () => {
      const crawlId = 'c1';
      repository.updateWithSelect.mockResolvedValue({
        total_ceps: 10,
        processed_ceps: 5,
      } as any);

      await service.saveSingleResult({
        crawlId,
        cep: '01000009',
        status: CrawResultStatusEnum.SUCCESS,
      });

      expect(repository.update).toHaveBeenCalledWith(crawlId, {
        status: CrawlStatusEnum.RUNNING,
      });
    });
  });

  it('should find results', async () => {
    repository.findResults.mockResolvedValue([{ id: 'r1' }] as any);
    const results = await service.findResults('c1', 10, 20);
    expect(results).toHaveLength(1);
    expect(repository.findResults).toHaveBeenCalledWith('c1', 10, 20);
  });

  it('should count results using countResults', async () => {
    repository.countResults.mockResolvedValue(42);
    const count = await service.countResults('c1');
    expect(count).toBe(42);
    expect(repository.countResults).toHaveBeenCalledWith('c1');
  });

  it('should count results using findResultsCount', async () => {
    repository.countResults.mockResolvedValue(42);
    const count = await service.findResultsCount('c1');
    expect(count).toBe(42);
    expect(repository.countResults).toHaveBeenCalledWith('c1');
  });

  it('should create a crawl findById', async () => {
    repository.findById.mockResolvedValue({ id: 'c1' } as any);
    const crawl = await service.findById('c1');
    expect(crawl?.id).toBe('c1');
  });

  it('should increment failed_ceps when status is ERROR', async () => {
    const crawlId = 'c1';
    repository.updateWithSelect.mockResolvedValue({
      total_ceps: 10,
      processed_ceps: 5,
    } as any);

    await service.saveSingleResult({
      crawlId,
      cep: '01000009',
      status: CrawResultStatusEnum.ERROR,
    });

    expect(repository.updateWithSelect).toHaveBeenCalledWith(
      crawlId,
      expect.objectContaining({
        failed_ceps: { increment: 1 },
      }),
      expect.anything(),
    );
  });
});
