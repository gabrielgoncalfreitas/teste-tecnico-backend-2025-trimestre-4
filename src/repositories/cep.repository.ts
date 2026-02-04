import { Injectable } from '@nestjs/common';
import { PrismaService } from '../services/prisma.service';

@Injectable()
export class CepRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findMany(ceps: string[]) {
    return this.prisma.cep.findMany({
      where: {
        cep: { in: ceps },
      },
    });
  }

  async findUnique(cep: string) {
    return this.prisma.cep.findUnique({
      where: { cep },
    });
  }

  async searchCeps(q: string) {
    return this.prisma.cep.findMany({
      where: {
        OR: [
          { logradouro: { contains: q, mode: 'insensitive' } },
          { localidade: { contains: q, mode: 'insensitive' } },
          { uf: { contains: q, mode: 'insensitive' } },
        ],
      },
      select: { cep: true },
    });
  }

  async create(data: {
    cep: string;
    found: boolean;
    logradouro?: string;
    compl?: string;
    bairro?: string;
    localidade?: string;
    uf?: string;
    ibge?: string;
    gia?: string;
    ddd?: string;
    siafi?: string;
  }) {
    const { cep, ...rest } = data;
    return this.prisma.cep.upsert({
      where: { cep },
      create: data,
      update: {
        ...rest,
        updated_at: new Date(),
      },
    });
  }
}
