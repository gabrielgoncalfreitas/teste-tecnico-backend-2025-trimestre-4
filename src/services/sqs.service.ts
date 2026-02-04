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
    try {
      const command = new CreateQueueCommand({
        QueueName: queueName,
      });
      await this.sqsClient.send(command);
      this.logger.log(`Queue ${queueName} ensured.`);
    } catch (error: unknown) {
      this.logger.error(
        `Error creating queue: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  async sendMessage(body: any) {
    try {
      const command = new SendMessageCommand({
        QueueUrl: this.queueUrl,
        MessageBody: JSON.stringify(body),
      });
      await this.sqsClient.send(command);
    } catch (error: unknown) {
      this.logger.error(
        `Error sending message to SQS: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      throw error;
    }
  }

  async sendMessageBatch(entries: any[]) {
    const batchSize = 10;
    for (let i = 0; i < entries.length; i += batchSize) {
      const batch = entries.slice(i, i + batchSize).map((entry, index) => ({
        Id: `${i + index}`,
        MessageBody: JSON.stringify(entry),
      }));

      try {
        await this.sqsClient.send(
          new SendMessageBatchCommand({
            QueueUrl: this.queueUrl,
            Entries: batch,
          }),
        );
      } catch (error: unknown) {
        this.logger.error(
          `Error sending batch to SQS: ${error instanceof Error ? error.message : 'Unknown error'}`,
        );
      }
    }
  }

  async receiveMessages(maxNumberOfMessages = 10, waitTimeSeconds = 20) {
    try {
      const command = new ReceiveMessageCommand({
        QueueUrl: this.queueUrl,
        MaxNumberOfMessages: maxNumberOfMessages,
        WaitTimeSeconds: waitTimeSeconds,
      });
      const response = await this.sqsClient.send(command);
      return response.Messages || [];
    } catch (error: unknown) {
      this.logger.error(
        `Error receiving messages from SQS: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      return [];
    }
  }

  async deleteMessage(receiptHandle: string) {
    try {
      const command = new DeleteMessageCommand({
        QueueUrl: this.queueUrl,
        ReceiptHandle: receiptHandle,
      });
      await this.sqsClient.send(command);
    } catch (error: unknown) {
      this.logger.error(
        `Error deleting message from SQS: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }
}
