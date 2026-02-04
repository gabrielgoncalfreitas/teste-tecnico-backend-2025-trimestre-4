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
  it('should handle error when creating queue', async () => {
    (mockSqsClient.send as jest.Mock).mockRejectedValue(
      new Error('Queue Error'),
    );
    await service.createQueueIfNotExists('test');
    expect(mockSqsClient.send).toHaveBeenCalled(); // Should just catch and log
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
  it('should return empty array when receive fails', async () => {
    (mockSqsClient.send as jest.Mock).mockRejectedValue(
      new Error('Recv Error'),
    );
    const result = await service.receiveMessages();
    expect(result).toEqual([]);
  });
  it('should delete a message', async () => {
    await service.deleteMessage('handle');
    expect(mockSqsClient.send).toHaveBeenCalledWith(
      expect.any(DeleteMessageCommand),
    );
  });
  it('should handle error when delete fails', async () => {
    (mockSqsClient.send as jest.Mock).mockRejectedValue(new Error('Del Error'));
    await service.deleteMessage('handle');
    expect(mockSqsClient.send).toHaveBeenCalled(); // Should just catch and log
  });
  it('should handle errors when sending fails', async () => {
    (mockSqsClient.send as jest.Mock).mockRejectedValue(new Error('SQS Error'));
    await expect(service.sendMessage({ data: 1 })).rejects.toThrow('SQS Error');
  });
  it('should handle errors when batch fails', async () => {
    (mockSqsClient.send as jest.Mock).mockRejectedValue(
      new Error('Batch Error'),
    );
    await service.sendMessageBatch([1]);
    expect(mockSqsClient.send).toHaveBeenCalled(); // Logs only
  });
});
