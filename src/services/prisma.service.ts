import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaClient } from 'generated/prisma';
import { existsSync } from 'fs';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  constructor(private readonly configService: ConfigService) {
    const isDocker = existsSync('/.dockerenv');
    const url = isDocker
      ? configService.get<string>('DOCKER_DATABASE_URL')
      : configService.get<string>('PRISMA_DATABASE_URL');

    super({
      datasources: {
        db: {
          url,
        },
      },
      errorFormat: 'pretty',
      log: ['error', 'info', 'warn'],
    });
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
