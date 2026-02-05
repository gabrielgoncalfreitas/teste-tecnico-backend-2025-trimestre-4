import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Message } from '@aws-sdk/client-sqs';
import { SqsService } from '../services/sqs.service';
import { AddressService } from '../services/address.service';
import { CrawlService } from '../services/crawl.service';
import { CepCacheService } from '../services/cep-cache.service';
import { AddressData } from '../interfaces/address.interface';
import { CrawResultStatusEnum, Prisma } from 'generated/prisma';

interface CrawlPayload {
  crawl_id: string;
  cep: string;
}

@Injectable()
export class CrawlWorker implements OnModuleInit {
  private readonly logger = new Logger(CrawlWorker.name);
  private isPolling = false;

  constructor(
    private readonly sqsService: SqsService,
    private readonly addressService: AddressService,
    private readonly crawlService: CrawlService,
    private readonly cepCacheService: CepCacheService,
    private readonly configService: ConfigService,
  ) {}

  onModuleInit() {
    this.startPolling().catch((err: Error) =>
      this.logger.error('Failed to start polling', err.message),
    );
  }

  async startPolling() {
    const args = process.argv.slice(2);
    const roleArg = args.find((arg) => arg.startsWith('--role='));
    const role = process.env.ROLE ?? (roleArg ? roleArg.split('=')[1] : null);
    const runWorker = !role || role === 'worker';

    if (!runWorker) {
      this.logger.log('Worker disabled via command line argument.');
      return;
    }
    if (this.isPolling) return;
    this.isPolling = true;
    this.logger.log('Started polling SQS...');

    while (this.isPolling) {
      try {
        const messages = await this.sqsService.receiveMessages(10, 20);
        if (messages && messages.length > 0) {
          const rateLimit = parseInt(
            this.configService.get<string>('WORKER_RATE_LIMIT_MS') || '1000', // Default 1s for safety
            10,
          );

          // STRICT SEQUENTIAL PROCESSING
          // ViaCEP is blocking parallel requests. We must process one by one.
          for (const msg of messages) {
            await this.processMessage(msg);
            // Wait specific delay between requests to respect API limits
            await new Promise((resolve) => setTimeout(resolve, rateLimit));
          }
        }
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Unknown error';
        this.logger.error('Polling error', message);
        await new Promise((resolve) => setTimeout(resolve, 5000));
      }
    }
  }

  async processMessage(message: Message) {
    if (!message.Body) return;

    let body: CrawlPayload;
    try {
      body = JSON.parse(message.Body);
    } catch (e) {
      this.logger.error('Failed to parse message body', message.Body);
      // If we can't parse it, we should probably delete it to avoid infinite loop,
      // or move to DLQ. For now, just return (it stays in queue or eventually DLQ).
      // Actually, standard practice: if invalid, delete or DLQ.
      // Let's just log and return for now as per previous behavior (mostly).
      // Previous behavior: JSON.parse was inside try, if failed -> catch -> log "Failed to process message ... Unexpected token..."
      // and NOT deleted.
      return;
    }

    const { crawl_id, cep } = body;

    try {
      const data = await this.addressService.getAddress(cep, crawl_id);

      let status: CrawResultStatusEnum = CrawResultStatusEnum.SUCCESS;
      let errorMessage: string | undefined;

      if (!data || data.erro) {
        status = CrawResultStatusEnum.ERROR;
        errorMessage = 'CEP not found';
        await this.cepCacheService.save(cep, false);
      } else {
        await this.cepCacheService.save(cep, true, data);
      }

      await this.crawlService.saveSingleResult({
        crawlId: crawl_id,
        cep,
        status,
        data: (data && !data.erro
          ? data
          : undefined) as unknown as Prisma.InputJsonValue,
        errorMessage,
      });

      await this.sqsService.deleteMessage(message.ReceiptHandle as string);
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      this.logger.warn(
        `Failed to process crawl ${crawl_id} for CEP ${cep}: ${msg}. Message will be retried.`,
      );
    }
  }
}
