import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { AddressProvider } from '../interfaces/address-provider.interface';
import { AddressData } from '../interfaces/address.interface';

@Injectable()
export class ViaCepProvider implements AddressProvider {
  private readonly logger = new Logger(ViaCepProvider.name);
  private readonly url: string;

  private readonly timeout: number;
  private readonly maxRetries = 3;

  constructor(private readonly configService: ConfigService) {
    this.url = this.configService.get<string>('VIACEP_URL') as string;
    this.timeout = parseInt(
      this.configService.get<string>('VIACEP_TIMEOUT_MS') || '4000',
      10,
    );
  }

  getName(): string {
    return 'ViaCEP';
  }

  async getAddress(cep: string): Promise<AddressData | null> {
    const cleanCep = cep.replace(/\D/g, '');
    let attempt = 0;

    while (attempt <= this.maxRetries) {
      try {
        const response = await axios.get<AddressData>(
          `${this.url}/${cleanCep}/json/`,
          { timeout: this.timeout },
        );

        if (response.data && !response.data.erro) {
          return response.data;
        }
        // If it's a "not found" error from API (erro: true), no need to retry
        return null;
      } catch (error: any) {
        attempt++;
        const isLastAttempt = attempt > this.maxRetries;
        const isTimeout =
          error.code === 'ECONNABORTED' || error.message?.includes('timeout');
        const isThrottled = error.response?.status === 429;

        if (isLastAttempt || (!isTimeout && !isThrottled && error.response)) {
          // If it's a real 404/400 or we exhausted retries, log and give up
          const status = error.response?.status;
          this.logger.error(
            `Failed to fetch CEP ${cep}${status ? ` (Status: ${status})` : ''}: ${error.message}`,
          );
          return null;
        }

        const delay = Math.pow(2, attempt) * 1000;
        this.logger.warn(
          `Retry ${attempt}/${this.maxRetries} for CEP ${cep} due to ${isTimeout ? 'timeout' : 'throttling'}. Waiting ${delay}ms...`,
        );
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }

    return null;
  }
}
