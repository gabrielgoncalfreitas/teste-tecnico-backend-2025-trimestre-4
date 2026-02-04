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
    jest.clearAllMocks();
  });

  it('should initialize on module init (mocking existsSync)', async () => {
    // Arrange
    (fs.existsSync as jest.Mock).mockReturnValue(false);
    mockSqsClient.send.mockResolvedValue({} as any);

    // Act
    await service.onModuleInit();

    // Assert
    expect(mockSqsClient.send).toHaveBeenCalledWith(
      expect.any(CreateQueueCommand),
    );
  });

  it('should initialize on module init for Docker', async () => {
    // Arrange
    (fs.existsSync as jest.Mock).mockReturnValue(true);
    (mockSqsClient.send as jest.Mock).mockResolvedValue({} as any);

    // Act
    await service.onModuleInit();

    // Assert
    expect(configService.get).toHaveBeenCalledWith('DOCKER_SQS_ENDPOINT');
  });

  it('should handle error when creating queue', async () => {
    // Arrange
    (mockSqsClient.send as jest.Mock).mockRejectedValue(
      new Error('Queue Error'),
    );

    // Act
    await service.createQueueIfNotExists('test');

    // Assert
    expect(mockSqsClient.send).toHaveBeenCalled(); // Should just catch and log
  });

  it('should send a single message', async () => {
    // Act
    await service.sendMessage({ test: 'data' });

    // Assert
    expect(mockSqsClient.send).toHaveBeenCalledWith(
      expect.any(SendMessageCommand),
    );
  });

  it('should send messages in batches of 10', async () => {
    // Arrange
    const entries = Array.from({ length: 15 }, (_, i) => ({ id: i }));

    // Act
    await service.sendMessageBatch(entries);

    // Assert
    expect(mockSqsClient.send).toHaveBeenCalledTimes(2); // First 10, then 5
    expect(mockSqsClient.send).toHaveBeenCalledWith(
      expect.any(SendMessageBatchCommand),
    );
  });

  it('should receive messages', async () => {
    // Arrange
    const mockMessages = [{ Body: 'test' }];
    mockSqsClient.send.mockResolvedValue({ Messages: mockMessages } as any);

    // Act
    const result = await service.receiveMessages();

    // Assert
    expect(result).toEqual(mockMessages);
    expect(mockSqsClient.send).toHaveBeenCalledWith(
      expect.any(ReceiveMessageCommand),
    );
  });

  it('should return empty array when Messages is undefined', async () => {
    // Arrange
    (mockSqsClient.send as jest.Mock).mockResolvedValue({} as any);

    // Act
    const result = await service.receiveMessages();

    // Assert
    expect(result).toEqual([]);
  });

  it('should return empty array when receive fails', async () => {
    // Arrange
    mockSqsClient.send.mockRejectedValue(new Error('Recv Error'));

    // Act
    const result = await service.receiveMessages();

    // Assert
    expect(result).toEqual([]);
  });

  it('should delete a message', async () => {
    // Act
    await service.deleteMessage('handle');

    // Assert
    expect(mockSqsClient.send).toHaveBeenCalledWith(
      expect.any(DeleteMessageCommand),
    );
  });

  it('should handle error when delete fails', async () => {
    // Arrange
    (mockSqsClient.send as jest.Mock).mockRejectedValue(new Error('Del Error'));

    // Act
    await service.deleteMessage('handle');

    // Assert
    expect(mockSqsClient.send).toHaveBeenCalled(); // Should just catch and log
  });

  it('should handle errors when sending fails', async () => {
    // Arrange
    (mockSqsClient.send as jest.Mock).mockRejectedValue(new Error('SQS Error'));

    // Act & Assert
    await expect(service.sendMessage({ data: 1 })).rejects.toThrow('SQS Error');
  });

  it('should handle errors when batch fails', async () => {
    // Arrange
    (mockSqsClient.send as jest.Mock).mockRejectedValue(
      new Error('Batch Error'),
    );

    // Act
    await service.sendMessageBatch([1]);

    // Assert
    expect(mockSqsClient.send).toHaveBeenCalled(); // Logs only
  });
});
