import { Injectable } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { AddressData } from '../contracts/address.contract';

@Injectable()
export class CepCacheService {
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

  async save(cep: string, found: boolean, data?: AddressData) {
    const cleanCep = cep.replace(/\D/g, '');

    if (!found || !data) {
      return this.prisma.cep
        .create({
          data: {
            cep: cleanCep,
            found: false,
          },
        })
        .catch(() => {});
    }

    return this.prisma.cep
      .create({
        data: {
          cep: cleanCep,
          found: true,
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
      .catch(() => {});
  }
}
