import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { SqsService } from '../services/sqs.service';
import { ViaCepService, ViaCepResponse } from '../services/viacep.service';
import { PrismaService } from '../services/prisma.service';
import { CrawlStatusEnum, CrawResultStatusEnum } from 'generated/prisma';

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
    private readonly viaCepService: ViaCepService,
    private readonly prisma: PrismaService,
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
        const messages = await this.sqsService.receiveMessages(10, 20); // Long polling
        if (messages.length > 0) {
          // Process sequentially to respect rate limiting (1 req/sec)
          for (const msg of messages) {
            await this.processMessage(msg);
          }
        }
      } catch (error) {
        this.logger.error('Polling error', error);
        await new Promise((resolve) => setTimeout(resolve, 5000)); // Backoff
      }
    }
  }

  async processMessage(message: any) {
    try {
      // Rate limiting: sleep for 400ms ensures ~150 req/min per worker instance
      // 400ms is a balanced delay for ViaCEP/OpenCEP.
      await new Promise((resolve) => setTimeout(resolve, 400));

      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-argument
      const body = JSON.parse(message.Body) as CrawlPayload;
      const { crawl_id, cep } = body;
      const cleanCep = cep.replace(/\D/g, '');

      // Fetch data
      let status: CrawResultStatusEnum = CrawResultStatusEnum.SUCCESS;
      let data: ViaCepResponse | null = null;
      let errorMessage: string | null = null;
      let shouldRetry = false;

      // 2. Fetch from API (Handler already checked cache)
      try {
        data = await this.viaCepService.getCep(cep);
        if (!data || data.erro) {
          status = CrawResultStatusEnum.ERROR;
          errorMessage = 'CEP not found';
          data = null;

          // 3. Save "Not Found" to Cache (Negative Cache)
          await this.prisma.cep
            .create({
              data: {
                cep: cleanCep,
                found: false,
              },
            })
            .catch(() => {}); // Ignore collisions
        } else {
          // 3. Save to Cache
          await this.prisma.cep
            .create({
              data: {
                cep: cleanCep,
                logradouro: data.logradouro,
                compl: data.complemento,
                bairro: data.bairro,
                localidade: data.localidade,
                uf: data.uf,
                ibge: data.ibge,
                gia: data.gia,
                ddd: data.ddd,
                siafi: data.siafi,
              },
            })
            .catch((err: any) => {
              // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
              if (err.code !== 'P2002') {
                this.logger.warn(`Failed to save cache for CEP ${cep}`, err);
              }
            });
        }
      } catch (e: any) {
        status = CrawResultStatusEnum.ERROR;
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment
        errorMessage = e.message || 'Unknown Error';
        shouldRetry = true;
        this.logger.warn(
          // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
          `Transient error fetching CEP ${cep}, triggering retry: ${e.message}`,
        );
      }

      if (shouldRetry) {
        throw new Error(`Retryable error: ${errorMessage}`);
      }

      // Save Result (Only if not retrying)
      await this.prisma.crawl_result.create({
        data: {
          crawl_id,
          cep,
          status,

          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          data: (data as any) ?? undefined,
          error_message: errorMessage,
        },
      });

      // Update Stats (Atomic increment)

      const updateData: any = {
        processed_ceps: { increment: 1 },
      };

      if (status === CrawResultStatusEnum.SUCCESS) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        updateData.success_ceps = { increment: 1 };
      } else {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        updateData.failed_ceps = { increment: 1 };
      }

      const updatedCrawl = await this.prisma.crawl.update({
        where: { id: crawl_id },
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        data: updateData,
        select: { total_ceps: true, processed_ceps: true },
      });

      // Update status to FINISHED if all processed
      if (updatedCrawl.processed_ceps >= updatedCrawl.total_ceps) {
        await this.prisma.crawl.update({
          where: { id: crawl_id },
          data: { status: CrawlStatusEnum.FINISHED },
        });
      } else {
        // Mark as RUNNING if it was PENDING
        await this.prisma.crawl.updateMany({
          where: { id: crawl_id, status: CrawlStatusEnum.PENDING },
          data: { status: CrawlStatusEnum.RUNNING },
        });
      }

      // Delete successfully processed (or permanently failed) message
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-argument
      await this.sqsService.deleteMessage(message.ReceiptHandle);
    } catch (error: any) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      if (error.message.startsWith('Retryable error')) {
        // Logs already handled or minimal log
      } else {
        this.logger.error(
          // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
          `Failed to process message ${message.MessageId}`,
          error,
        );
      }
      // Do NOT delete message, let SQS retry
    }
  }
}
