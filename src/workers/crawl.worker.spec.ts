import { Test, TestingModule } from '@nestjs/testing';
import { CrawlWorker } from './crawl.worker';
import { SqsService } from '../services/sqs.service';
import { AddressService } from '../services/address.service';
import { CrawlService } from '../services/crawl.service';
import { CepCacheService } from '../services/cep-cache.service';
import { CrawResultStatusEnum } from 'generated/prisma';

describe('CrawlWorker', () => {
  let worker: CrawlWorker;
  let sqsService: jest.Mocked<SqsService>;
  let addressService: jest.Mocked<AddressService>;
  let crawlService: jest.Mocked<CrawlService>;
  let cepCacheService: jest.Mocked<CepCacheService>;

  beforeEach(async () => {
    jest.useFakeTimers();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CrawlWorker,
        {
          provide: SqsService,
          useValue: {
            receiveMessages: jest.fn(),
            deleteMessage: jest.fn(),
          },
        },
        {
          provide: AddressService,
          useValue: {
            getAddress: jest.fn(),
          },
        },
        {
          provide: CrawlService,
          useValue: {
            saveSingleResult: jest.fn(),
          },
        },
        {
          provide: CepCacheService,
          useValue: {
            save: jest.fn(),
          },
        },
      ],
    }).compile();

    worker = module.get<CrawlWorker>(CrawlWorker);
    sqsService = module.get(SqsService);
    addressService = module.get(AddressService);
    crawlService = module.get(CrawlService);
    cepCacheService = module.get(CepCacheService);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('processMessages', () => {
    it('should process a message, fetch address, and delete message', async () => {
      // Arrange
      const mockMessage = {
        Body: JSON.stringify({ crawl_id: 'c1', cep: '01001000' }),
        ReceiptHandle: 'h1',
      };
      sqsService.receiveMessages.mockResolvedValue([mockMessage] as any);
      addressService.getAddress.mockResolvedValue({ logradouro: 'Sé' } as any);

      // Act
      const promise = (worker as any).processMessage(mockMessage);
      jest.runAllTimers();
      await promise;

      // Assert
      expect(addressService.getAddress).toHaveBeenCalledWith('01001000');
      expect(cepCacheService.save).toHaveBeenCalledWith(
        '01001000',
        true,
        expect.anything(),
      );
      expect(crawlService.saveSingleResult).toHaveBeenCalledWith(
        expect.objectContaining({
          crawlId: 'c1',
          status: CrawResultStatusEnum.SUCCESS,
        }),
      );
      expect(sqsService.deleteMessage).toHaveBeenCalledWith('h1');
    });

    it('should handle missing address and save error result', async () => {
      // Arrange
      const mockMessage = {
        Body: JSON.stringify({ crawl_id: 'c1', cep: '99999999' }),
        ReceiptHandle: 'h2',
      };
      sqsService.receiveMessages.mockResolvedValue([mockMessage] as any);
      addressService.getAddress.mockResolvedValue(null);

      // Act
      const promise = (worker as any).processMessage(mockMessage);
      jest.runAllTimers();
      await promise;

      // Assert
      expect(cepCacheService.save).toHaveBeenCalledWith('99999999', false);
      expect(crawlService.saveSingleResult).toHaveBeenCalledWith(
        expect.objectContaining({
          status: CrawResultStatusEnum.ERROR,
        }),
      );
      expect(sqsService.deleteMessage).toHaveBeenCalledWith('h2');
    });

    it('should handle transient error and throw (triggering retry logic)', async () => {
      // Arrange
      const mockMessage = {
        Body: JSON.stringify({ crawl_id: 'c1', cep: '01001000' }),
        ReceiptHandle: 'h3',
      };
      addressService.getAddress.mockRejectedValue(new Error('API Timeout'));

      // Act & Assert
      const promise = (worker as any).processMessage(mockMessage);
      jest.runAllTimers();
      await promise; // error is caught and logged, not rethrown to top if it's caught in the processMessage loop
      expect(sqsService.deleteMessage).not.toHaveBeenCalled();
    });
  });

  describe('startPolling', () => {
    it('should not start if role is not worker', async () => {
      // Arrange
      process.argv = ['node', 'app', '--role=api'];

      // Act
      await worker.startPolling();

      // Assert
      expect(worker['isPolling']).toBe(false);
    });

    it('should start polling and process messages if role is worker', async () => {
      // Arrange
      process.argv = ['node', 'app', '--role=worker'];
      const mockMessage = {
        Body: JSON.stringify({ crawl_id: 'c1', cep: '01001000' }),
      };
      sqsService.receiveMessages.mockResolvedValueOnce([mockMessage] as any);
      sqsService.receiveMessages.mockResolvedValue([]); // Stop after second call

      const processSpy = jest
        .spyOn(worker as any, 'processMessage')
        .mockResolvedValue(undefined);

      // Act
      const pollPromise = worker.startPolling();

      // Give it some ticks to run the loop iteration
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();

      worker['isPolling'] = false; // Break the loop
      await pollPromise;

      // Assert
      expect(sqsService.receiveMessages).toHaveBeenCalled();
      expect(processSpy).toHaveBeenCalledWith(mockMessage);
    });

    it('should log error if JSON parsing fails', async () => {
      // Arrange
      const mockMessage = {
        Body: 'invalid-json',
        ReceiptHandle: 'h4',
      };

      // Act
      const promise = (worker as any).processMessage(mockMessage);
      jest.runAllTimers();
      await promise;

      // Assert
      expect(sqsService.deleteMessage).not.toHaveBeenCalled();
    });

    it('should handle polling error and wait 5s', async () => {
      // Arrange
      process.argv = ['node', 'app', '--role=worker'];
      sqsService.receiveMessages.mockRejectedValue(new Error('SQS Down'));

      // Act
      const pollPromise = worker.startPolling();

      // Wait for it to hit the catch block and the await setTimeout
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();

      // Advance timers to trigger the setTimeout in the catch block
      jest.advanceTimersByTime(5000);

      // Break loop
      worker['isPolling'] = false;

      // Need another tick to finish the loop after timeout resolves
      await Promise.resolve();
      await pollPromise;

      // Assert
      expect(sqsService.receiveMessages).toHaveBeenCalled();
    });
  });

  describe('onModuleInit', () => {
    it('should log error if startPolling fails', async () => {
      const loggerSpy = jest.spyOn(worker['logger'], 'error');
      jest
        .spyOn(worker, 'startPolling')
        .mockRejectedValue(new Error('Init Fail'));

      worker.onModuleInit();

      // Flush microtasks - need several ticks for NestJS async logic
      for (let i = 0; i < 5; i++) {
        await Promise.resolve();
      }

      expect(loggerSpy).toHaveBeenCalledWith(
        'Failed to start polling',
        expect.any(Error),
      );
    });
  });
});
