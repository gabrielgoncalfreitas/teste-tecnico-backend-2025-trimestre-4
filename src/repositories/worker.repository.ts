import { Injectable } from '@nestjs/common';
import { PrismaService } from '../services/prisma.service';

@Injectable()
export class WorkerRepository {
  constructor(private readonly prisma: PrismaService) {}

  async upsertHeartbeat(id: string, hostname: string, role: string) {
    return this.prisma.worker.upsert({
      where: { id },
      update: {
        last_seen: new Date(),
        hostname,
        role,
      },
      create: {
        id,
        hostname,
        role,
        last_seen: new Date(),
      },
    });
  }

  async getActiveWorkers(minutesAgo = 1) {
    const threshold = new Date(Date.now() - minutesAgo * 60 * 1000);
    return this.prisma.worker.findMany({
      where: {
        last_seen: {
          gte: threshold,
        },
      },
    });
  }

  async cleanOldWorkers(minutesAgo = 5) {
    const threshold = new Date(Date.now() - minutesAgo * 60 * 1000);
    return this.prisma.worker.deleteMany({
      where: {
        last_seen: {
          lt: threshold,
        },
      },
    });
  }
}
