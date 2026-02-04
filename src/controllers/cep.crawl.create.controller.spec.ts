import { Test, TestingModule } from '@nestjs/testing';
import { CepCrawlCreateController } from './cep.crawl.create.controller';
import { CepCrawlCreateHandler } from '../handlers/cep.crawl.create.handler';
import { Response } from 'express';

describe('CepCrawlCreateController', () => {
  let controller: CepCrawlCreateController;
  let handler: jest.Mocked<CepCrawlCreateHandler>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CepCrawlCreateController],
      providers: [
        {
          provide: CepCrawlCreateHandler,
          useValue: {
            main: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<CepCrawlCreateController>(CepCrawlCreateController);
    handler = module.get(CepCrawlCreateHandler);
  });

  describe('main', () => {
    it('should call handler and return response with correct status', async () => {
      // Arrange
      const body = { cep_start: '01000000', cep_end: '01000005' };
      const mockResult = { code: 201, data: { id: 'crawl-1' } };
      handler.main.mockResolvedValue(mockResult as any);

      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis(),
      } as unknown as Response;

      // Act
      await controller.main(res, body);

      // Assert
      expect(handler.main).toHaveBeenCalledWith({ body });
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(mockResult);
    });
  });
});
