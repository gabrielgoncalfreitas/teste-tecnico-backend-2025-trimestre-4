import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { AddressProvider } from '../interfaces/address-provider.interface';
import { AddressData } from '../interfaces/address.interface';

@Injectable()
export class OpenCepProvider implements AddressProvider {
  private readonly logger = new Logger(OpenCepProvider.name);
  private readonly url: string;

  constructor(private readonly configService: ConfigService) {
    this.url = this.configService.get<string>('OPENCEP_URL') as string;
  }

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
    } catch (error: unknown) {
      if (axios.isAxiosError(error) && error.response?.status === 404) {
        return null;
      }
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`OpenCEP failed for ${cep}: ${message}`);
      return null;
    }
    return null;
  }
}
