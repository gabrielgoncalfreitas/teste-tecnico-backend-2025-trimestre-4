import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { OpenCepProvider } from './opencep.provider';
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;
describe('OpenCepProvider', () => {
  let provider: OpenCepProvider;
  let configService: jest.Mocked<ConfigService>;
  beforeEach(() => {
    configService = {
      get: jest.fn().mockImplementation((key: string) => {
        if (key === 'OPENCEP_URL') return 'https://opencep.com/v1';
        return null;
      }),
    } as any;
    provider = new OpenCepProvider(configService);
    jest.clearAllMocks();
  });
  it('should return address data when request is successful', async () => {
    const mockData = {
      logradouro: 'Rua Direita',
      localidade: 'São Paulo',
      uf: 'SP',
    };
    mockedAxios.get.mockResolvedValue({ data: mockData });
    const result = await provider.getAddress('01001001');
    expect(result).toEqual(mockData);
    expect(mockedAxios.get).toHaveBeenCalledWith(
      'https://opencep.com/v1/01001001.json',
      { timeout: 10000 },
    );
  });
  it('should return null when OpenCEP returns 404', async () => {
    const error = {
      isAxiosError: true,
      response: { status: 404 },
    };
    mockedAxios.isAxiosError.mockReturnValue(true);
    mockedAxios.get.mockRejectedValue(error);
    const result = await provider.getAddress('00000000');
    expect(result).toBeNull();
  });
  it('should return null when request fails with other error', async () => {
    mockedAxios.get.mockRejectedValue(new Error('Timeout'));
    const result = await provider.getAddress('01001000');
    expect(result).toBeNull();
  });
});
