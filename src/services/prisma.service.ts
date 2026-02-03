import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from 'generated/prisma';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  constructor() {
    super({
      errorFormat: 'pretty',
      log: ['error', 'info', 'warn'],
    });
  }

  async onModuleInit() {
    await this.$connect();
  }
}
