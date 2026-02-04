import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { ViaCepProvider } from './viacep.provider';
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;
describe('ViaCepProvider', () => {
  let provider: ViaCepProvider;
  let configService: jest.Mocked<ConfigService>;
  beforeEach(() => {
    configService = {
      get: jest.fn().mockImplementation((key: string) => {
        if (key === 'VIACEP_URL') return 'https://viacep.com.br/ws';
        return null;
      }),
    } as any;
    provider = new ViaCepProvider(configService);

    // Silence logger
    jest.spyOn(provider['logger'], 'error').mockImplementation(() => undefined);
    jest.spyOn(provider['logger'], 'warn').mockImplementation(() => undefined);
    jest.clearAllMocks();
  });
  it('should return address data when request is successful', async () => {
    const mockData = {
      logradouro: 'Praça da Sé',
      localidade: 'São Paulo',
      uf: 'SP',
    };
    mockedAxios.get.mockResolvedValue({ data: mockData });
    const result = await provider.getAddress('01001000');
    expect(result).toEqual(mockData);
    expect(mockedAxios.get).toHaveBeenCalledWith(
      'https://viacep.com.br/ws/01001000/json/',
      { timeout: 4000 },
    );
  });
  it('should return null when ViaCEP returns an error flag', async () => {
    mockedAxios.get.mockResolvedValue({ data: { erro: true } });
    const result = await provider.getAddress('99999999');
    expect(result).toBeNull();
  });
  it('should return null and log warning when request fails', async () => {
    mockedAxios.get.mockRejectedValue(new Error('Network Error'));
    const result = await provider.getAddress('01001000');
    expect(result).toBeNull();
  });
});
