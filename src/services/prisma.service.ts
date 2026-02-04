import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaClient } from 'generated/prisma';
import { existsSync } from 'fs';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  constructor(private readonly configService: ConfigService) {
    const isDocker = existsSync('/.dockerenv');
    const url = isDocker
      ? configService.get<string>('DOCKER_DATABASE_URL')
      : configService.get<string>('DATABASE_URL');

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
}
