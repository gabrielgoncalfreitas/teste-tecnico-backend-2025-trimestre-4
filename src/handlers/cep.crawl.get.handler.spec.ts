import { Test, TestingModule } from '@nestjs/testing';
import { CepCrawlGetHandler } from './cep.crawl.get.handler';
import { CrawlService } from '../services/crawl.service';
import { CepCrawlGetResponse } from '../responses/cep.crawl.get.response';
import { CepCrawlNotFoundResponse } from '../responses/cep.crawl.not-found.response';
import { CrawlStatusEnum } from 'generated/prisma';
describe('CepCrawlGetHandler', () => {
  let handler: CepCrawlGetHandler;
  let crawlService: jest.Mocked<CrawlService>;
  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CepCrawlGetHandler,
        {
          provide: CrawlService,
          useValue: {
            findById: jest.fn(),
          },
        },
      ],
    }).compile();
    handler = module.get(CepCrawlGetHandler);
    crawlService = module.get(CrawlService);
  });
  describe('main', () => {
    it('should return CepCrawlGetResponse when crawl exists', async () => {
      const crawlId = 'crawl-123';
      const mockCrawl = {
        id: crawlId,
        cep_start: '01000000',
        cep_end: '01000001',
        status: CrawlStatusEnum.FINISHED,
        total_ceps: 2,
        processed_ceps: 2,
        success_ceps: 2,
        failed_ceps: 0,
      };
      crawlService.findById.mockResolvedValue(mockCrawl as any);
      const result = await handler.main({ crawl_id: crawlId });
      expect(result).toBeInstanceOf(CepCrawlGetResponse);
      const getRes = result as CepCrawlGetResponse;
      expect(getRes.data.id).toBe(crawlId);
      expect(getRes.data.status).toBe(CrawlStatusEnum.FINISHED);
    });
    it('should return CepCrawlNotFoundResponse when crawl does not exist', async () => {
      crawlService.findById.mockResolvedValue(null);
      const result = await handler.main({ crawl_id: 'non-existent' });
      expect(result).toBeInstanceOf(CepCrawlNotFoundResponse);
    });
  });
});
