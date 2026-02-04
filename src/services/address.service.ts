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
    try {
      const address = await this.viaCep.getAddress(cep);
      if (address) {
        this.logger.log(
          `${logPrefix}Success fetching CEP ${cep} via ${this.viaCep.getName()}`,
        );
        return address;
      }
    } catch (error: unknown) {
      this.logger.error(
        `${logPrefix}ViaCEP failed for ${cep}: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      return null;
    }

    this.logger.error(`${logPrefix}Address provider failed for CEP ${cep}`);
    return null;
  }
}
