import { Injectable, Logger } from '@nestjs/common';
import { AddressProvider } from '../interfaces/address-provider.interface';
import { ViaCepProvider } from '../providers/viacep.provider';
import { OpenCepProvider } from '../providers/opencep.provider';
import { AddressData } from '../interfaces/address.interface';

@Injectable()
export class AddressService {
  private readonly logger = new Logger(AddressService.name);
  private readonly providers: AddressProvider[];

  constructor(
    private readonly viaCep: ViaCepProvider,
    private readonly openCep: OpenCepProvider,
  ) {
    this.providers = [this.viaCep, this.openCep];
  }

  async getAddress(cep: string): Promise<AddressData | null> {
    for (const provider of this.providers) {
      try {
        const address = await provider.getAddress(cep);
        if (address) {
          this.logger.log(
            `Success fetching CEP ${cep} via ${provider.getName()}`,
          );
          return address;
        }
      } catch (error: any) {
        this.logger.warn(
          `Provider ${provider.getName()} failed for ${cep}: ${error.message}`,
        );
      }
    }

    this.logger.error(`All address providers failed for CEP ${cep}`);
    return null;
  }
}
