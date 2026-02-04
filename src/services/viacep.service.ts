import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import { Agent as HttpAgent } from 'http';
import { Agent as HttpsAgent } from 'https';

export interface ViaCepResponse {
  cep: string;
  logradouro: string;
  complemento: string;
  bairro: string;
  localidade: string;
  uf: string;
  ibge: string;
  gia: string;
  ddd: string;
  siafi: string;
  erro?: boolean;
}

@Injectable()
export class ViaCepService {
  private readonly logger = new Logger(ViaCepService.name);
  private readonly viaCepUrl = 'http://viacep.com.br/ws';
  private readonly openCepUrl = 'https://opencep.com/v1';

  async getCep(cep: string): Promise<ViaCepResponse | null> {
    const cleanCep = cep.replace(/\D/g, '');

    // 1. Try ViaCEP (Original)
    try {
      const response = await axios.get<ViaCepResponse>(
        `${this.viaCepUrl}/${cleanCep}/json/`,
        { timeout: 4000 },
      );
      if (response.data && !response.data.erro) {
        return response.data;
      }
    } catch (error) {
      this.logger.warn(`ViaCEP failed for ${cep}, trying OpenCEP...`);
    }

    // 2. Fallback to OpenCEP
    try {
      const response = await axios.get<ViaCepResponse>(
        `${this.openCepUrl}/${cleanCep}.json`,
        { timeout: 10000 },
      );

      if (response.data) {
        this.logger.log(`OpenCEP success for CEP ${cep}`);
        return response.data;
      }
    } catch (error) {
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 404) return null;
        this.logger.error(
          `BrasilAPI also failed for ${cep}: ${error.message}`,
          error.stack,
        );
      } else {
        this.logger.error(
          `Unknown error fetching CEP ${cep} from any service`,
          error,
        );
      }
    }

    return null;
  }
}
