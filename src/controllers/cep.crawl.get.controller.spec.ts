import { Test, TestingModule } from '@nestjs/testing';
import { CepCrawlGetController } from './cep.crawl.get.controller';
import { CepCrawlGetHandler } from '../handlers/cep.crawl.get.handler';
import { Response } from 'express';
describe('CepCrawlGetController', () => {
  let controller: CepCrawlGetController;
  let handler: jest.Mocked<CepCrawlGetHandler>;
  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CepCrawlGetController],
      providers: [
        {
          provide: CepCrawlGetHandler,
          useValue: {
            main: jest.fn(),
          },
        },
      ],
    }).compile();
    controller = module.get<CepCrawlGetController>(CepCrawlGetController);
    handler = module.get(CepCrawlGetHandler);
  });
  describe('main', () => {
    it('should call handler with crawlId and return response', async () => {
      const crawlId = 'test-id';
      const mockResult = { code: 200, data: { id: crawlId } };
      handler.main.mockResolvedValue(mockResult as any);
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis(),
      } as unknown as Response;
      await controller.main(res, crawlId);
      expect(handler.main).toHaveBeenCalledWith({ crawl_id: crawlId });
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(mockResult);
    });
  });
});
