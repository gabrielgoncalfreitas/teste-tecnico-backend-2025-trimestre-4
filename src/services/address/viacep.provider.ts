import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import { AddressProvider } from './address-provider.interface';
import { AddressData } from '../../contracts/address.contract';

@Injectable()
export class ViaCepProvider implements AddressProvider {
  private readonly logger = new Logger(ViaCepProvider.name);
  private readonly url = 'https://viacep.com.br/ws';

  getName(): string {
    return 'ViaCEP';
  }

  async getAddress(cep: string): Promise<AddressData | null> {
    const cleanCep = cep.replace(/\D/g, '');
    try {
      const response = await axios.get<AddressData>(
        `${this.url}/${cleanCep}/json/`,
        { timeout: 4000 },
      );
      if (response.data && !response.data.erro) {
        return response.data;
      }
    } catch (error: any) {
      this.logger.warn(`ViaCEP failed for ${cep}: ${error.message}`);
    }
    return null;
  }
}
