import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { SqsService } from '../services/sqs.service';
import { AddressService } from '../services/address.service';
import { CrawlService } from '../services/crawl.service';
import { CepCacheService } from '../services/cep-cache.service';
import { AddressData } from '../contracts/address.contract';
import { CrawResultStatusEnum } from 'generated/prisma';

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
  ) {}

  onModuleInit() {
    this.startPolling().catch((err) =>
      this.logger.error('Failed to start polling', err),
    );
  }

  async startPolling() {
    const args = process.argv.slice(2);
    const roleArg = args.find((arg) => arg.startsWith('--role='));
    const role = roleArg ? roleArg.split('=')[1] : null;
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
        if (messages.length > 0) {
          for (const msg of messages) {
            await this.processMessage(msg);
          }
        }
      } catch (error) {
        this.logger.error('Polling error', error);
        await new Promise((resolve) => setTimeout(resolve, 5000));
      }
    }
  }

  async processMessage(message: any) {
    try {
      await new Promise((resolve) => setTimeout(resolve, 400));

      const body = JSON.parse(message.Body) as CrawlPayload;
      const { crawl_id, cep } = body;

      let status: CrawResultStatusEnum = CrawResultStatusEnum.SUCCESS;
      let data: AddressData | null = null;
      let errorMessage: string | null = null;
      let shouldRetry = false;

      try {
        data = await this.addressService.getAddress(cep);
        if (!data || data.erro) {
          status = CrawResultStatusEnum.ERROR;
          errorMessage = 'CEP not found';
          data = null;
          await this.cepCacheService.save(cep, false);
        } else {
          await this.cepCacheService.save(cep, true, data);
        }
      } catch (e: any) {
        status = CrawResultStatusEnum.ERROR;
        errorMessage = e.message || 'Unknown Error';
        shouldRetry = true;
        this.logger.warn(
          `Transient error fetching CEP ${cep}, triggering retry: ${e.message}`,
        );
      }

      if (shouldRetry) throw new Error(`Retryable error: ${errorMessage}`);

      await this.crawlService.saveSingleResult({
        crawlId: crawl_id,
        cep,
        status,
        data,
        errorMessage: errorMessage ?? undefined,
      });

      await this.sqsService.deleteMessage(message.ReceiptHandle);
    } catch (error: any) {
      if (!error.message.startsWith('Retryable error')) {
        this.logger.error(
          `Failed to process message ${message.MessageId}`,
          error,
        );
      }
    }
  }
}
