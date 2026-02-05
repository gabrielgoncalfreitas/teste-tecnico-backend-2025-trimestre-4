import { Test, TestingModule } from '@nestjs/testing';
import { CrawlService } from './crawl.service';
import { CrawlRepository } from '../repositories/crawl.repository';
import { CepRepository } from '../repositories/cep.repository';
import { SqsService } from './sqs.service';
import { CrawlStatusEnum, CrawResultStatusEnum } from 'generated/prisma';

describe('CrawlService', () => {
  let service: CrawlService;
  let repository: jest.Mocked<CrawlRepository>;
  let cepRepository: jest.Mocked<CepRepository>;
  let sqsService: jest.Mocked<SqsService>;

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
            findUnfinished: jest.fn().mockResolvedValue([]),
            getExistingCeps: jest.fn().mockResolvedValue([]),
          },
        },
        {
          provide: CepRepository,
          useValue: {
            searchCeps: jest.fn().mockResolvedValue([]),
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

    service = module.get(CrawlService);
    repository = module.get(CrawlRepository);
    cepRepository = module.get(CepRepository);
    sqsService = module.get(SqsService);

    // Silence logger
    jest.spyOn(service['logger'], 'log').mockImplementation(() => undefined);
  });

  describe('onModuleInit', () => {
    it('should call recoverUnfinishedCrawls', async () => {
      const spy = jest
        .spyOn(service, 'recoverUnfinishedCrawls')
        .mockResolvedValue();
      await service.onModuleInit();
      expect(spy).toHaveBeenCalled();
    });
  });

  describe('recoverUnfinishedCrawls', () => {
    it('should do nothing if no unfinished crawls found', async () => {
      repository.findUnfinished.mockResolvedValue([]);
      await service.recoverUnfinishedCrawls();
      expect(repository.findUnfinished).toHaveBeenCalled();
      expect(repository.getExistingCeps).not.toHaveBeenCalled();
    });

    it('should recover missing ceps for unfinished crawls', async () => {
      const unfinishedCrawl = {
        id: 'c1',
        cep_start: '01000000',
        cep_end: '01000002', // Range has 3 CEPs: 0, 1, 2
        status: CrawlStatusEnum.RUNNING,
      };
      repository.findUnfinished.mockResolvedValue([unfinishedCrawl] as any);
      // Simulate that CEP 01000001 is already processed
      repository.getExistingCeps.mockResolvedValue(['01000001']);

      await service.recoverUnfinishedCrawls();

      expect(repository.getExistingCeps).toHaveBeenCalledWith('c1');
      expect(sqsService.sendMessageBatch).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ crawlId: 'c1', cep: '01000000' }), // Missing
          expect.objectContaining({ crawlId: 'c1', cep: '01000002' }), // Missing
        ]),
      );
      // Should NOT contain the existing one
      expect(sqsService.sendMessageBatch).not.toHaveBeenCalledWith(
        expect.arrayContaining([expect.objectContaining({ cep: '01000001' })]),
      );
    });

    it('should not send messages if all ceps are already processed', async () => {
      const unfinishedCrawl = {
        id: 'c1',
        cep_start: '01000000',
        cep_end: '01000000',
        status: CrawlStatusEnum.RUNNING,
      };
      repository.findUnfinished.mockResolvedValue([unfinishedCrawl] as any);
      repository.getExistingCeps.mockResolvedValue(['01000000']);

      await service.recoverUnfinishedCrawls();

      expect(sqsService.sendMessageBatch).not.toHaveBeenCalled();
    });
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

    it('should handle not found ceps in bulk process', async () => {
      const cached = [{ cep: '99999999', found: false }];
      await service.processBulkCachedResults('c1', cached, true);
      expect(repository.createResults).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            status: CrawResultStatusEnum.ERROR,
            error_message: 'CEP not found (cached)',
          }),
        ]),
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

  describe('findResults', () => {
    it('should find results without filters', async () => {
      repository.findResults.mockResolvedValue([{ id: 'r1' }] as any);
      const results = await service.findResults('c1', 10, 20);
      expect(results).toHaveLength(1);
      expect(repository.findResults).toHaveBeenCalledWith(
        'c1',
        10,
        20,
        expect.objectContaining({ matching_ceps: undefined }),
      );
    });

    it('should find results with search query q', async () => {
      cepRepository.searchCeps.mockResolvedValue([{ cep: '01001000' }] as any);
      repository.findResults.mockResolvedValue([{ id: 'r1' }] as any);

      const results = await service.findResults('c1', 0, 10, { q: 'Sé' });

      expect(cepRepository.searchCeps).toHaveBeenCalledWith('Sé');
      expect(repository.findResults).toHaveBeenCalledWith(
        'c1',
        0,
        10,
        expect.objectContaining({
          q: 'Sé',
          matching_ceps: ['01001000'],
        }),
      );
      expect(results).toHaveLength(1);
    });
  });

  describe('countResults', () => {
    it('should count results using countResults', async () => {
      repository.countResults.mockResolvedValue(42);
      const count = await service.countResults('c1');
      expect(count).toBe(42);
      expect(repository.countResults).toHaveBeenCalledWith(
        'c1',
        expect.objectContaining({ matching_ceps: undefined }),
      );
    });

    it('should count results with search query q', async () => {
      cepRepository.searchCeps.mockResolvedValue([{ cep: '01001000' }] as any);
      repository.countResults.mockResolvedValue(5);

      const count = await service.countResults('c1', { q: 'Sé' });

      expect(cepRepository.searchCeps).toHaveBeenCalledWith('Sé');
      expect(repository.countResults).toHaveBeenCalledWith(
        'c1',
        expect.objectContaining({
          q: 'Sé',
          matching_ceps: ['01001000'],
        }),
      );
      expect(count).toBe(5);
    });
  });

  it('should count results using findResultsCount', async () => {
    repository.countResults.mockResolvedValue(42);
    const count = await service.findResultsCount('c1');
    expect(count).toBe(42);
    expect(repository.countResults).toHaveBeenCalledWith(
      'c1',
      expect.objectContaining({ matching_ceps: undefined }),
    );
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
