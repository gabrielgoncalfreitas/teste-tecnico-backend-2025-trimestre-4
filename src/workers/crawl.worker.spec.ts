import { Test, TestingModule } from '@nestjs/testing';
import { CrawlWorker } from './crawl.worker';
import { SqsService } from '../services/sqs.service';
import { AddressService } from '../services/address.service';
import { CrawlService } from '../services/crawl.service';
import { CepCacheService } from '../services/cep-cache.service';
import { ConfigService } from '@nestjs/config';
import { Message } from '@aws-sdk/client-sqs';
import { AddressData } from '../interfaces/address.interface';
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
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockReturnValue('0'), // Set to 0 to speed up tests
          },
        },
      ],
    }).compile();
    worker = module.get<CrawlWorker>(CrawlWorker);
    sqsService = module.get(SqsService);
    addressService = module.get(AddressService);
    crawlService = module.get(CrawlService);
    cepCacheService = module.get(CepCacheService);

    // Silence logger
    jest.spyOn(worker['logger'], 'error').mockImplementation(() => undefined);
    jest.spyOn(worker['logger'], 'warn').mockImplementation(() => undefined);
    jest.spyOn(worker['logger'], 'log').mockImplementation(() => undefined);
  });
  afterEach(() => {
    jest.useRealTimers();
  });
  describe('processMessages', () => {
    it('should process a message, fetch address, and delete message', async () => {
      const mockMessage: Message = {
        Body: JSON.stringify({ crawl_id: 'c1', cep: '01001000' }),
        ReceiptHandle: 'h1',
        MessageId: 'm1',
      };
      sqsService.receiveMessages.mockResolvedValue([mockMessage]);
      addressService.getAddress.mockResolvedValue({
        logradouro: 'Sé',
      } as AddressData);
      const promise = (worker as any).processMessage(mockMessage);
      jest.runAllTimers();
      await promise;
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
      const mockMessage: Message = {
        Body: JSON.stringify({ crawl_id: 'c1', cep: '99999999' }),
        ReceiptHandle: 'h2',
        MessageId: 'm2',
      };
      sqsService.receiveMessages.mockResolvedValue([mockMessage]);
      addressService.getAddress.mockResolvedValue(null);
      const promise = (worker as any).processMessage(mockMessage);
      jest.runAllTimers();
      await promise;
      expect(cepCacheService.save).toHaveBeenCalledWith('99999999', false);
      expect(crawlService.saveSingleResult).toHaveBeenCalledWith(
        expect.objectContaining({
          status: CrawResultStatusEnum.ERROR,
        }),
      );
      expect(sqsService.deleteMessage).toHaveBeenCalledWith('h2');
    });

    it('should handle transient error and throw (triggering retry logic)', async () => {
      const mockMessage: Message = {
        Body: JSON.stringify({ crawl_id: 'c1', cep: '01001000' }),
        ReceiptHandle: 'h3',
        MessageId: 'm3',
      };
      addressService.getAddress.mockRejectedValue(new Error('API Timeout'));
      const promise = (worker as any).processMessage(mockMessage);
      jest.runAllTimers();
      await promise;
      expect(sqsService.deleteMessage).not.toHaveBeenCalled();
    });
  });

  describe('startPolling', () => {
    it('should not start if role is not worker', async () => {
      process.argv = ['node', 'app', '--role=api'];
      await worker.startPolling();
      expect(worker['isPolling']).toBe(false);
    });

    it('should start polling and process messages if role is worker', async () => {
      jest.useRealTimers(); // Use real timers since we mock rate limit to 0
      process.argv = ['node', 'app', '--role=worker'];
      const mockMessage: Message = {
        Body: JSON.stringify({ crawl_id: 'c1', cep: '01001000' }),
      };
      sqsService.receiveMessages.mockResolvedValueOnce([mockMessage]);
      sqsService.receiveMessages.mockResolvedValueOnce([mockMessage]);
      sqsService.receiveMessages.mockImplementation(async () => {
        worker['isPolling'] = false;
        return [];
      });
      const processSpy = jest
        .spyOn(worker as any, 'processMessage')
        .mockResolvedValue(undefined);
      const pollPromise = worker.startPolling();

      await pollPromise;
      expect(sqsService.receiveMessages).toHaveBeenCalled();
      expect(processSpy).toHaveBeenCalledWith(mockMessage);
    });

    it('should log error if JSON parsing fails', async () => {
      const mockMessage: Message = {
        Body: 'invalid-json',
        ReceiptHandle: 'h4',
      };
      const promise = (worker as any).processMessage(mockMessage);
      jest.runAllTimers();
      await promise;
      expect(sqsService.deleteMessage).not.toHaveBeenCalled();
    });

    it('should handle polling error and wait 5s', async () => {
      process.argv = ['node', 'app', '--role=worker'];
      sqsService.receiveMessages.mockRejectedValue(new Error('SQS Down'));
      const pollPromise = worker.startPolling();
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
      jest.advanceTimersByTime(5000);
      worker['isPolling'] = false;
      await Promise.resolve();
      await pollPromise;
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
      for (let i = 0; i < 5; i++) {
        await Promise.resolve();
      }
      expect(loggerSpy).toHaveBeenCalledWith(
        'Failed to start polling',
        'Init Fail',
      );
    });
  });
});
