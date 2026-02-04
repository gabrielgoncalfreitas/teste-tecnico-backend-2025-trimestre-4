import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { AddressProvider } from '../interfaces/address-provider.interface';
import { AddressData } from '../interfaces/address.interface';

@Injectable()
export class ViaCepProvider implements AddressProvider {
  private readonly logger = new Logger(ViaCepProvider.name);
  private readonly url: string;

  constructor(private readonly configService: ConfigService) {
    this.url = this.configService.get<string>('VIACEP_URL') as string;
  }

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
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`ViaCEP failed for ${cep}: ${message}`);
      return null;
    }
    return null;
  }
}
