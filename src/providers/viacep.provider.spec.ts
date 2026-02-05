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
        if (key === 'VIACEP_TIMEOUT_MS') return '500';
        return null;
      }),
    } as any;
    provider = new ViaCepProvider(configService);

    // Silence logger
    jest.spyOn(provider['logger'], 'error').mockImplementation(() => undefined);
    jest.spyOn(provider['logger'], 'warn').mockImplementation(() => undefined);
    mockedAxios.isAxiosError.mockImplementation(
      (err: any) => !!err.response || err.code === 'ECONNABORTED',
    );
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
      { timeout: 500 },
    );
  });
  it('should return null when ViaCEP returns an error flag', async () => {
    mockedAxios.get.mockResolvedValue({ data: { erro: true } });
    const result = await provider.getAddress('99999999');
    expect(result).toBeNull();
  });
  it('should retry on timeout and eventually return null', async () => {
    const timeoutError = { code: 'ECONNABORTED', message: 'timeout' };
    mockedAxios.get.mockRejectedValue(timeoutError);

    jest.useFakeTimers();
    const promise = provider.getAddress('01001000');

    // 1 initial + 3 retries = 4 calls
    for (let i = 0; i < 4; i++) {
      // Flush microtasks so the code reaches the await axios.get
      await Promise.resolve();
      await Promise.resolve();
      // Advance timers for the exponential backoff sleep
      jest.advanceTimersByTime(10000);
    }

    const result = await promise;
    expect(result).toBeNull();
    expect(mockedAxios.get).toHaveBeenCalledTimes(4);
    jest.useRealTimers();
  });

  it('should retry on 429 status and eventually return null', async () => {
    const error429 = {
      response: { status: 429 },
      message: 'Too Many Requests',
    };
    mockedAxios.get.mockRejectedValue(error429);

    jest.useFakeTimers();
    const promise = provider.getAddress('01001000');

    for (let i = 0; i < 4; i++) {
      await Promise.resolve();
      await Promise.resolve();
      jest.advanceTimersByTime(10000);
    }

    const result = await promise;
    expect(result).toBeNull();
    expect(mockedAxios.get).toHaveBeenCalledTimes(4);
    jest.useRealTimers();
  });

  it('should NOT retry on 404 status', async () => {
    const error404 = { response: { status: 404 }, message: 'Not Found' };
    mockedAxios.get.mockRejectedValue(error404);

    const result = await provider.getAddress('01001000');
    expect(result).toBeNull();
    expect(mockedAxios.get).toHaveBeenCalledTimes(1);
  });
});
