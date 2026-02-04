import { Test, TestingModule } from '@nestjs/testing';
import { CepCrawlCreateHandler } from './cep.crawl.create.handler';
import { CrawlService } from '../services/crawl.service';
import { CepCacheService } from '../services/cep-cache.service';
import { SqsService } from '../services/sqs.service';
import { CepCrawlCreateResponse } from '../responses/cep.crawl.create.response';
import { CepCrawlNotFoundResponse } from '../responses/cep.crawl.not-found.response';
import { CrawlStatusEnum } from 'generated/prisma';

describe('CepCrawlCreateHandler', () => {
  let handler: CepCrawlCreateHandler;
  let crawlService: jest.Mocked<CrawlService>;
  let cepCacheService: jest.Mocked<CepCacheService>;
  let sqsService: jest.Mocked<SqsService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CepCrawlCreateHandler,
        {
          provide: CrawlService,
          useValue: {
            createCrawl: jest.fn(),
            processBulkCachedResults: jest.fn(),
            findById: jest.fn(),
          },
        },
        {
          provide: CepCacheService,
          useValue: {
            findMany: jest.fn(),
          },
        },
        {
          provide: SqsService,
          useValue: {
            sendMessageBatch: jest.fn(),
          },
        },
      ],
    }).compile();

    handler = module.get<CepCrawlCreateHandler>(CepCrawlCreateHandler);
    crawlService = module.get(CrawlService);
    cepCacheService = module.get(CepCacheService);
    sqsService = module.get(SqsService);
  });

  describe('main', () => {
    it('should create a crawl and enqueue missing ceps (Happy Path)', async () => {
      const body = { cep_start: '01000000', cep_end: '01000002' }; // 3 CEPs
      const mockCrawl = {
        id: 'crawl-123',
        ...body,
        total_ceps: 3,
        status: CrawlStatusEnum.PENDING,
      };

      crawlService.createCrawl.mockResolvedValue(mockCrawl as any);
      cepCacheService.findMany.mockResolvedValue([]); // No cache
      crawlService.findById.mockResolvedValue({
        ...mockCrawl,
        processed_ceps: 0,
        success_ceps: 0,
        failed_ceps: 0,
      } as any);

      const result = await handler.main({ body });

      expect(crawlService.createCrawl).toHaveBeenCalledWith({
        cep_start: '01000000',
        cep_end: '01000002',
        total_ceps: 3,
      });
      expect(sqsService.sendMessageBatch).toHaveBeenCalledWith([
        { crawl_id: 'crawl-123', cep: '01000000' },
        { crawl_id: 'crawl-123', cep: '01000001' },
        { crawl_id: 'crawl-123', cep: '01000002' },
      ]);
      expect(result).toBeInstanceOf(CepCrawlCreateResponse);
      expect((result as CepCrawlCreateResponse).data.id).toBe('crawl-123');
    });

    it('should apply cache and not enqueue if all CEPs are cached', async () => {
      const body = { cep_start: '01000000', cep_end: '01000000' }; // 1 CEP
      const mockCrawl = {
        id: 'crawl-123',
        ...body,
        total_ceps: 1,
        status: CrawlStatusEnum.PENDING,
      };
      const cachedCep = { cep: '01000000', found: true };

      crawlService.createCrawl.mockResolvedValue(mockCrawl as any);
      cepCacheService.findMany.mockResolvedValue([cachedCep as any]);
      crawlService.findById.mockResolvedValue({
        ...mockCrawl,
        status: CrawlStatusEnum.FINISHED,
        processed_ceps: 1,
        success_ceps: 1,
        failed_ceps: 0,
      } as any);

      const result = await handler.main({ body });

      expect(crawlService.processBulkCachedResults).toHaveBeenCalledWith(
        'crawl-123',
        [cachedCep],
        true, // isCompleteRange
      );
      expect(sqsService.sendMessageBatch).not.toHaveBeenCalled();
      expect(result).toBeInstanceOf(CepCrawlCreateResponse);
      expect((result as CepCrawlCreateResponse).data.status).toBe(
        CrawlStatusEnum.FINISHED,
      );
    });

    it('should return CepCrawlNotFoundResponse if crawl goes missing after creation', async () => {
      const body = { cep_start: '01000000', cep_end: '01000000' };
      crawlService.createCrawl.mockResolvedValue({ id: 'ghost' } as any);
      cepCacheService.findMany.mockResolvedValue([]);
      crawlService.findById.mockResolvedValue(null);

      const result = await handler.main({ body });

      expect(result).toBeInstanceOf(CepCrawlNotFoundResponse);
    });
  });
});
