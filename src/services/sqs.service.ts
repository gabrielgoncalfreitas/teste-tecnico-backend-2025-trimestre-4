import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { existsSync } from 'fs';
import {
  SQSClient,
  SendMessageCommand,
  SendMessageBatchCommand,
  ReceiveMessageCommand,
  DeleteMessageCommand,
  CreateQueueCommand,
} from '@aws-sdk/client-sqs';

@Injectable()
export class SqsService implements OnModuleInit {
  private sqsClient: SQSClient;
  private queueUrl: string;
  private readonly logger = new Logger(SqsService.name);

  constructor(private readonly configService: ConfigService) {}

  async onModuleInit() {
    const isDocker = existsSync('/.dockerenv');
    const endpoint = (
      isDocker
        ? this.configService.get<string>('DOCKER_SQS_ENDPOINT')
        : this.configService.get<string>('SQS_ENDPOINT')
    ) as string;

    this.sqsClient = new SQSClient({
      region: this.configService.get<string>('AWS_REGION') as string,
      endpoint,
      credentials: {
        accessKeyId: this.configService.get<string>(
          'AWS_ACCESS_KEY_ID',
        ) as string,
        secretAccessKey: this.configService.get<string>(
          'AWS_SECRET_ACCESS_KEY',
        ) as string,
      },
    });

    const queueName = this.configService.get<string>(
      'SQS_QUEUE_NAME',
    ) as string;
    const accountId = this.configService.get<string>(
      'AWS_ACCOUNT_ID',
    ) as string;
    const queueBaseUrl = (
      isDocker
        ? this.configService.get<string>('DOCKER_SQS_ENDPOINT')
        : this.configService.get<string>('SQS_ENDPOINT')
    ) as string;

    this.queueUrl =
      this.configService.get<string>('SQS_QUEUE_URL') ||
      `${queueBaseUrl}/${accountId}/${queueName}`;

    await this.createQueueIfNotExists(queueName);
  }

  async createQueueIfNotExists(queueName: string) {
    const command = new CreateQueueCommand({
      QueueName: queueName,
    });
    await this.sqsClient.send(command);
    this.logger.log(`Queue ${queueName} ensured.`);
  }

  async sendMessage(body: any) {
    const command = new SendMessageCommand({
      QueueUrl: this.queueUrl,
      MessageBody: JSON.stringify(body),
    });
    await this.sqsClient.send(command);
  }

  async sendMessageBatch(entries: any[]) {
    const batchSize = 10;
    for (let i = 0; i < entries.length; i += batchSize) {
      const batch = entries.slice(i, i + batchSize).map((entry, index) => ({
        Id: `${i + index}`,
        MessageBody: JSON.stringify(entry),
      }));

      await this.sqsClient.send(
        new SendMessageBatchCommand({
          QueueUrl: this.queueUrl,
          Entries: batch,
        }),
      );
    }
  }

  async receiveMessages(maxNumberOfMessages = 10, waitTimeSeconds = 20) {
    const command = new ReceiveMessageCommand({
      QueueUrl: this.queueUrl,
      MaxNumberOfMessages: maxNumberOfMessages,
      WaitTimeSeconds: waitTimeSeconds,
    });
    const response = await this.sqsClient.send(command);
    return response.Messages || [];
  }

  async deleteMessage(receiptHandle: string) {
    const command = new DeleteMessageCommand({
      QueueUrl: this.queueUrl,
      ReceiptHandle: receiptHandle,
    });
    await this.sqsClient.send(command);
  }
}
