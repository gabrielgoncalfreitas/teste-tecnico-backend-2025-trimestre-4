import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import { AddressProvider } from './address-provider.interface';
import { AddressData } from '../../contracts/address.contract';

@Injectable()
export class OpenCepProvider implements AddressProvider {
  private readonly logger = new Logger(OpenCepProvider.name);
  private readonly url = 'https://opencep.com/v1';

  getName(): string {
    return 'OpenCEP';
  }

  async getAddress(cep: string): Promise<AddressData | null> {
    const cleanCep = cep.replace(/\D/g, '');
    try {
      const response = await axios.get<AddressData>(
        `${this.url}/${cleanCep}.json`,
        { timeout: 10000 },
      );
      if (response.data) {
        return response.data;
      }
    } catch (error: any) {
      if (axios.isAxiosError(error) && error.response?.status === 404) {
        return null;
      }
      this.logger.warn(`OpenCEP failed for ${cep}: ${error.message}`);
    }
    return null;
  }
}
