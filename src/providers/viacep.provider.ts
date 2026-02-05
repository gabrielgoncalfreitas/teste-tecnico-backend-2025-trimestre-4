import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { AddressProvider } from '../interfaces/address-provider.interface';
import { AddressData } from '../interfaces/address.interface';

import { ThrottlingError } from '../errors/throttling.error';

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
      } catch (error: unknown) {
        attempt++;
        let isTimeout = false;
        let isThrottled = false;
        let status: number | undefined;
        let message = 'Unknown error';

        if (axios.isAxiosError(error)) {
          isTimeout =
            error.code === 'ECONNABORTED' || error.message?.includes('timeout');
          status = error.response?.status;
          isThrottled = status === 429;
          message = error.message;
        } else if (error instanceof Error) {
          message = error.message;
        }

        const isLastAttempt = attempt > this.maxRetries;

        if (isThrottled || isTimeout) {
          if (isLastAttempt) {
            if (isThrottled) {
              throw new ThrottlingError(
                `ViaCEP throttling threshold reached for CEP ${cep}. Circuit breaker triggered.`,
              );
            }
            throw new Error(
              `ViaCEP request timed out for CEP ${cep} after ${this.maxRetries} retries.`,
            );
          }

          const delay = Math.pow(2, attempt) * 1000;
          this.logger.warn(
            `Retry ${attempt}/${this.maxRetries} for CEP ${cep} due to ${isTimeout ? 'timeout' : 'throttling'}. Waiting ${delay}ms...`,
          );
          await new Promise((resolve) => setTimeout(resolve, delay));
          continue;
        }

        // For non-transient errors (like 400, 404, or after exhaustion of other errors)
        this.logger.error(
          `Failed to fetch CEP ${cep}${status ? ` (Status: ${status})` : ''}: ${message}`,
        );
        return null;
      }
    }

    return null;
  }
}
