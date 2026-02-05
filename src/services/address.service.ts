import { Injectable, Logger } from '@nestjs/common';
import { AddressProvider } from '../interfaces/address-provider.interface';
import { ViaCepProvider } from '../providers/viacep.provider';
// import { OpenCepProvider } from '../providers/opencep.provider';
import { AddressData } from '../interfaces/address.interface';

@Injectable()
export class AddressService {
  private readonly logger = new Logger(AddressService.name);
  private readonly providers: AddressProvider[];

  constructor(private readonly viaCep: ViaCepProvider) {
    this.providers = [this.viaCep];
  }

  async getAddress(cep: string, crawlId?: string): Promise<AddressData | null> {
    const logPrefix = crawlId ? `[CrawlID: ${crawlId}] ` : '';

    const address = await this.viaCep.getAddress(cep);
    if (address) {
      this.logger.log(
        `${logPrefix}Success fetching CEP ${cep} via ${this.viaCep.getName()}`,
      );
      return address;
    }

    this.logger.error(`${logPrefix}Address provider failed for CEP ${cep}`);
    return null;
  }
}
