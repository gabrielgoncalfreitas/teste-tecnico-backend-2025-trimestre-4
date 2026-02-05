import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Message } from '@aws-sdk/client-sqs';
import { SqsService } from '../services/sqs.service';
import { AddressService } from '../services/address.service';
import { CrawlService } from '../services/crawl.service';
import { CepCacheService } from '../services/cep-cache.service';
// AddressData import removed as it was unused
import { CrawResultStatusEnum, Prisma } from 'generated/prisma';
import { WorkerRepository } from '../repositories/worker.repository';
import * as os from 'os';
import { randomUUID } from 'crypto';

interface CrawlPayload {
  crawlId: string;
  cep: string;
}

@Injectable()
export class CrawlWorker implements OnModuleInit {
  private readonly logger = new Logger(CrawlWorker.name);
  private readonly MAX_CONSECUTIVE_ERRORS = 5;
  private isPolling = false;
  private consecutiveErrors = 0;
  private readonly workerId = randomUUID();
  private readonly hostname = os.hostname();

  constructor(
    private readonly sqsService: SqsService,
    private readonly addressService: AddressService,
    private readonly crawlService: CrawlService,
    private readonly cepCacheService: CepCacheService,
    private readonly configService: ConfigService,
    private readonly workerRepository: WorkerRepository,
  ) {}

  onModuleInit() {
    this.startPolling().catch((err: unknown) =>
      this.logger.error(
        'Failed to start polling',
        err instanceof Error ? err.message : 'Unknown error',
      ),
    );
    this.startHeartbeat();
  }

  private startHeartbeat() {
    // Immediate first registration
    this.registerWorker().catch((err: unknown) =>
      this.logger.error(
        'Initial worker registration failed',
        err instanceof Error ? err.message : 'Unknown error',
      ),
    );

    setInterval(() => {
      this.registerWorker().catch((err: unknown) =>
        this.logger.error(
          'Worker heartbeat failed',
          err instanceof Error ? err.message : 'Unknown error',
        ),
      );
    }, 15000); // 15s heartbeats
  }

  private async registerWorker() {
    const args = process.argv.slice(2);
    const roleArg = args.find((arg) => arg.startsWith('--role='));
    const role =
      process.env.ROLE ?? (roleArg ? roleArg.split('=')[1] : 'worker');

    await this.workerRepository.upsertHeartbeat(
      this.workerId,
      this.hostname,
      role,
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

          const concurrency = parseInt(
            this.configService.get<string>('WORKER_CONCURRENCY') || '3',
            10,
          );

          // Process messages in parallel batches to increase throughput
          // while respecting the rate limit per instance.
          for (let i = 0; i < messages.length; i += concurrency) {
            const batch = messages.slice(i, i + concurrency);
            await Promise.all(batch.map((msg) => this.processMessage(msg)));

            // Wait specific delay between batches
            await new Promise((resolve) => setTimeout(resolve, rateLimit));
          }
        }
      } catch (error) {
        this.consecutiveErrors++;
        const message =
          error instanceof Error ? error.message : 'Unknown error';

        // Exponential backoff for the polling loop itself if it keeps failing
        const baseDelay = 5000;
        const adaptiveDelay = Math.min(
          baseDelay * Math.pow(2, Math.min(this.consecutiveErrors, 5)),
          60000, // Max 1 minute pause
        );

        this.logger.error(
          `Polling error (Consecutive: ${this.consecutiveErrors}). Waiting ${adaptiveDelay}ms: ${message}`,
        );
        await new Promise((resolve) => setTimeout(resolve, adaptiveDelay));
      }
    }
  }

  async processMessage(message: Message) {
    if (!message.Body) return;

    let body: CrawlPayload;
    try {
      body = JSON.parse(message.Body) as CrawlPayload;
    } catch {
      this.logger.error('Failed to parse message body', message.Body);
      return;
    }

    const crawlId =
      body.crawlId || (body as unknown as { crawl_id: string }).crawl_id;
    const { cep } = body;

    try {
      const data = await this.addressService.getAddress(cep, crawlId);

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
        crawlId: crawlId,
        cep,
        status,
        data: (data && !data.erro
          ? data
          : undefined) as unknown as Prisma.InputJsonValue,
        errorMessage,
      });

      await this.sqsService.deleteMessage(message.ReceiptHandle as string);
      this.consecutiveErrors = 0; // Reset on success
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      this.logger.warn(
        `Failed to process crawl ${crawlId} for CEP ${cep}: ${msg}. Message will be retried.`,
      );
    }
  }
}
