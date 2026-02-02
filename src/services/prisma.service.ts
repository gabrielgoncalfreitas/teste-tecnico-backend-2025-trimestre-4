import { Injectable } from '@nestjs/common';
import { PrismaClient } from 'generated/client';

@Injectable()
export class PrismaService extends PrismaClient {
  constructor() {
    super({
      accelerateUrl: process.env.DATABASE_URL!,
      errorFormat: 'pretty',
      log: ['error', 'info', 'warn'],
    });
  }
}
