import { Test, TestingModule } from '@nestjs/testing';
import { SqsService } from './sqs.service';
import { ConfigService } from '@nestjs/config';
import {
  SQSClient,
  SendMessageCommand,
  SendMessageBatchCommand,
  ReceiveMessageCommand,
  DeleteMessageCommand,
  CreateQueueCommand,
} from '@aws-sdk/client-sqs';
import * as fs from 'fs';
jest.mock('@aws-sdk/client-sqs');
jest.mock('fs');
describe('SqsService', () => {
  let service: SqsService;
  let configService: ConfigService;
  let mockSqsClient: jest.Mocked<SQSClient>;
  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SqsService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockImplementation((key) => {
              if (key === 'SQS_QUEUE_URL') return 'http://queue-url';
              if (key === 'AWS_REGION') return 'us-east-1';
              return 'test-value';
            }),
          },
        },
      ],
    }).compile();
    service = module.get<SqsService>(SqsService);
    configService = module.get<ConfigService>(ConfigService);
    // Setup client mock
    service['sqsClient'] = new SQSClient({}) as any;
    service['queueUrl'] = 'http://queue-url';
    mockSqsClient = service['sqsClient'] as any;
    (mockSqsClient.send as jest.Mock).mockResolvedValue({} as any); // Default success

    // Silence logger
    jest.spyOn(service['logger'], 'error').mockImplementation(() => undefined);
    jest.spyOn(service['logger'], 'log').mockImplementation(() => undefined);

    jest.clearAllMocks();
  });
  it('should initialize on module init (mocking existsSync)', async () => {
    (fs.existsSync as jest.Mock).mockReturnValue(false);
    (mockSqsClient.send as jest.Mock).mockResolvedValue({} as any);
    await service.onModuleInit();
    expect(mockSqsClient.send).toHaveBeenCalledWith(
      expect.any(CreateQueueCommand),
    );
  });
  it('should initialize on module init for Docker', async () => {
    (fs.existsSync as jest.Mock).mockReturnValue(true);
    (mockSqsClient.send as jest.Mock).mockResolvedValue({} as any);
    await service.onModuleInit();
    expect(configService.get).toHaveBeenCalledWith('DOCKER_SQS_ENDPOINT');
  });

  it('should initialize on module init with fallback queue url', async () => {
    (fs.existsSync as jest.Mock).mockReturnValue(false);
    (configService.get as jest.Mock).mockImplementation((key) => {
      if (key === 'SQS_QUEUE_URL') return undefined; // Force fallback
      if (key === 'AWS_ACCOUNT_ID') return '123';
      if (key === 'SQS_QUEUE_NAME') return 'qname';
      if (key === 'SQS_ENDPOINT') return 'http://sqs';
      return 'test';
    });
    (mockSqsClient.send as jest.Mock).mockResolvedValue({} as any);
    await service.onModuleInit();
    expect(service['queueUrl']).toBe('http://sqs/123/qname');
  });

  it('should handle error when creating queue', async () => {
    (mockSqsClient.send as jest.Mock).mockRejectedValue(
      new Error('Queue Error'),
    );
    // Now it propagates error
    await expect(service.createQueueIfNotExists('test')).rejects.toThrow(
      'Queue Error',
    );
  });

  it('should propagate non-Error when creating queue', async () => {
    (mockSqsClient.send as jest.Mock).mockRejectedValue('String Error');
    await expect(service.createQueueIfNotExists('test')).rejects.toBe(
      'String Error',
    );
  });

  it('should send a single message', async () => {
    await service.sendMessage({ test: 'data' });
    expect(mockSqsClient.send).toHaveBeenCalledWith(
      expect.any(SendMessageCommand),
    );
  });
  it('should send messages in batches of 10', async () => {
    const entries = Array.from({ length: 15 }, (_, i) => ({ id: i }));
    await service.sendMessageBatch(entries);
    expect(mockSqsClient.send).toHaveBeenCalledTimes(2); // First 10, then 5
    expect(mockSqsClient.send).toHaveBeenCalledWith(
      expect.any(SendMessageBatchCommand),
    );
  });
  it('should receive messages', async () => {
    const mockMessages = [{ Body: 'test' }];
    (mockSqsClient.send as jest.Mock).mockResolvedValue({
      Messages: mockMessages,
    } as any);
    const result = await service.receiveMessages();
    expect(result).toEqual(mockMessages);
    expect(mockSqsClient.send).toHaveBeenCalledWith(
      expect.any(ReceiveMessageCommand),
    );
  });
  it('should return empty array when Messages is undefined', async () => {
    (mockSqsClient.send as jest.Mock).mockResolvedValue({} as any);
    const result = await service.receiveMessages();
    expect(result).toEqual([]);
  });
  it('should propagate non-Error when receive fails', async () => {
    (mockSqsClient.send as jest.Mock).mockRejectedValue('String Error');
    await expect(service.receiveMessages()).rejects.toBe('String Error');
  });
  it('should delete a message', async () => {
    await service.deleteMessage('handle');
    expect(mockSqsClient.send).toHaveBeenCalledWith(
      expect.any(DeleteMessageCommand),
    );
  });
  it('should propagate error when delete fails', async () => {
    (mockSqsClient.send as jest.Mock).mockRejectedValue(new Error('Del Error'));
    await expect(service.deleteMessage('handle')).rejects.toThrow('Del Error');
  });

  it('should propagate non-Error when delete fails', async () => {
    (mockSqsClient.send as jest.Mock).mockRejectedValue('String Error');
    await expect(service.deleteMessage('handle')).rejects.toBe('String Error');
  });

  it('should handle errors when sending fails', async () => {
    (mockSqsClient.send as jest.Mock).mockRejectedValue(new Error('SQS Error'));
    await expect(service.sendMessage({ data: 1 })).rejects.toThrow('SQS Error');
  });

  it('should handle non-Error when sending fails', async () => {
    (mockSqsClient.send as jest.Mock).mockRejectedValue('String Error');
    await expect(service.sendMessage({ data: 1 })).rejects.toBe('String Error');
  });

  it('should propagate errors when batch fails', async () => {
    (mockSqsClient.send as jest.Mock).mockRejectedValue(
      new Error('Batch Error'),
    );
    await expect(service.sendMessageBatch([1])).rejects.toThrow('Batch Error');
  });

  it('should propagate non-Error when batch fails', async () => {
    (mockSqsClient.send as jest.Mock).mockRejectedValue('String Error');
    await expect(service.sendMessageBatch([1])).rejects.toBe('String Error');
  });

  it('should propagate non-Error when receive fails', async () => {
    (mockSqsClient.send as jest.Mock).mockRejectedValue('String Error');
    await expect(service.receiveMessages()).rejects.toBe('String Error');
  });
});
