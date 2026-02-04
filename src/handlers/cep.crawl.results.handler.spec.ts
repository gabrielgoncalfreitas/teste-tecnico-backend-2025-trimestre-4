import { Test, TestingModule } from '@nestjs/testing';
import { CepCrawlResultsHandler } from './cep.crawl.results.handler';
import { CrawlService } from '../services/crawl.service';
import { CepCrawlResultsResponse } from '../responses/cep.crawl.results.response';
import { CepCrawlNotFoundResponse } from '../responses/cep.crawl.not-found.response';
import { CrawResultStatusEnum } from 'generated/prisma';

describe('CepCrawlResultsHandler', () => {
  let handler: CepCrawlResultsHandler;
  let crawlService: jest.Mocked<CrawlService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CepCrawlResultsHandler,
        {
          provide: CrawlService,
          useValue: {
            findById: jest.fn(),
            findResults: jest.fn(),
            countResults: jest.fn(),
          },
        },
      ],
    }).compile();

    handler = module.get(CepCrawlResultsHandler);
    crawlService = module.get(CrawlService);
  });

  describe('main', () => {
    it('should return CepCrawlResultsResponse with data when crawl exists', async () => {
      const crawlId = 'crawl-123';
      const mockResults = [
        {
          cep: '01000000',
          status: CrawResultStatusEnum.SUCCESS,
          data: {
            logradouro: 'Praça da Sé',
            localidade: 'São Paulo',
            uf: 'SP',
          },
          error_message: null,
        },
      ];
      crawlService.findById.mockResolvedValue({ id: crawlId } as any);
      crawlService.findResults.mockResolvedValue(mockResults as any);
      crawlService.countResults.mockResolvedValue(1);

      const result = await handler.main({
        crawl_id: crawlId,
        page: 1,
        take: 10,
      });

      expect(result).toBeInstanceOf(CepCrawlResultsResponse);
      const res = result as CepCrawlResultsResponse;
      expect(res.data).toHaveLength(1);
      expect(res.data[0].cep).toBe('01000000');
      expect(res.total).toBe(1);
      expect(crawlService.findResults).toHaveBeenCalledWith(crawlId, 0, 10, {
        cep_start: undefined,
        cep_end: undefined,
        status: undefined,
        q: undefined,
      });
    });

    it('should pass search query q to crawlService', async () => {
      const crawlId = 'crawl-123';
      crawlService.findById.mockResolvedValue({ id: crawlId } as any);
      crawlService.findResults.mockResolvedValue([]);
      crawlService.countResults.mockResolvedValue(0);

      await handler.main({
        crawl_id: crawlId,
        q: 'Sé',
      });

      expect(crawlService.findResults).toHaveBeenCalledWith(
        crawlId,
        0,
        10,
        expect.objectContaining({ q: 'Sé' }),
      );
      expect(crawlService.countResults).toHaveBeenCalledWith(
        crawlId,
        expect.objectContaining({ q: 'Sé' }),
      );
    });

    it('should return CepCrawlNotFoundResponse when crawl does not exist', async () => {
      crawlService.findById.mockResolvedValue(null);
      const result = await handler.main({ crawl_id: 'id-invalido' });
      expect(result).toBeInstanceOf(CepCrawlNotFoundResponse);
    });

    it('should use default pagination values if not provided', async () => {
      const crawlId = 'crawl-123';
      crawlService.findById.mockResolvedValue({ id: crawlId } as any);
      crawlService.findResults.mockResolvedValue([]);
      crawlService.countResults.mockResolvedValue(0);

      await handler.main({ crawl_id: crawlId });

      expect(crawlService.findResults).toHaveBeenCalledWith(crawlId, 0, 10, {
        cep_start: undefined,
        cep_end: undefined,
        status: undefined,
        q: undefined,
      });
    });
  });
});
