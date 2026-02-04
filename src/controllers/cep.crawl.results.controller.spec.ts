import { Test, TestingModule } from '@nestjs/testing';
import { CepCrawlResultsController } from './cep.crawl.results.controller';
import { CepCrawlResultsHandler } from '../handlers/cep.crawl.results.handler';
import { Response } from 'express';
describe('CepCrawlResultsController', () => {
  let controller: CepCrawlResultsController;
  let handler: jest.Mocked<CepCrawlResultsHandler>;
  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CepCrawlResultsController],
      providers: [
        {
          provide: CepCrawlResultsHandler,
          useValue: {
            main: jest.fn(),
          },
        },
      ],
    }).compile();
    controller = module.get<CepCrawlResultsController>(
      CepCrawlResultsController,
    );
    handler = module.get(CepCrawlResultsHandler);
  });
  describe('main', () => {
    it('should call handler with correct params and return response', async () => {
      const crawlId = 'test-id';
      const page = 2;
      const take = 5;
      const mockResult = { code: 200, data: [], total: 0 };
      handler.main.mockResolvedValue(mockResult as any);
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis(),
      } as unknown as Response;
      await controller.main(res, crawlId, page, take);
      expect(handler.main).toHaveBeenCalledWith({
        crawl_id: crawlId,
        page: page,
        take: take,
      });
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(mockResult);
    });
  });
});
