import { Injectable } from '@nestjs/common';
import { AddressData } from '../interfaces/address.interface';
import { CepRepository } from '../repositories/cep.repository';

@Injectable()
export class CepCacheService {
  constructor(private readonly repository: CepRepository) {}

  async findMany(ceps: string[]) {
    return this.repository.findMany(ceps);
  }

  async findUnique(cep: string) {
    return this.repository.findUnique(cep);
  }

  async save(cep: string, found: boolean, data?: AddressData) {
    const cleanCep = cep.replace(/\D/g, '');

    if (!found || !data) {
      return this.repository.create({
        cep: cleanCep,
        found: false,
      });
    }

    return this.repository.create({
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
    });
  }
}
