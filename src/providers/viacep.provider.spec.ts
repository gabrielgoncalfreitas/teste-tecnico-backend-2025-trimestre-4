import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { ViaCepProvider } from './viacep.provider';
import { ThrottlingError } from '../errors/throttling.error';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('ViaCepProvider', () => {
  let provider: ViaCepProvider;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ViaCepProvider,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              if (key === 'VIACEP_URL') return 'https://viacep.com.br/ws';
              if (key === 'VIACEP_TIMEOUT_MS') return '5000';
              return null;
            }),
          },
        },
      ],
    }).compile();

    provider = module.get<ViaCepProvider>(ViaCepProvider);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(provider).toBeDefined();
  });

  it('should return address data on success', async () => {
    const mockData = {
      cep: '01001-000',
      logradouro: 'Praça da Sé',
      complemento: 'lado ímpar',
      bairro: 'Sé',
      localidade: 'São Paulo',
      uf: 'SP',
    };

    mockedAxios.get.mockResolvedValue({ data: mockData });

    const result = await provider.getAddress('01001-000');

    expect(result).toEqual(mockData);
    expect(mockedAxios.get).toHaveBeenCalledWith(
      'https://viacep.com.br/ws/01001000/json/',
      { timeout: 5000 },
    );
  });

  it('should return null if CEP is not found (erro: true)', async () => {
    mockedAxios.get.mockResolvedValue({ data: { erro: true } });

    const result = await provider.getAddress('00000000');

    expect(result).toBeNull();
  });

  it('should retry on 429 status and throw ThrottlingError eventually', async () => {
    const error429 = {
      isAxiosStatus: true,
      response: { status: 429 },
      message: 'Too Many Requests',
    };
    mockedAxios.get.mockRejectedValue(error429);
    mockedAxios.isAxiosError.mockReturnValue(true);

    jest.useFakeTimers();
    const promise = provider.getAddress('01001000');

    for (let i = 0; i < 4; i++) {
      await Promise.resolve(); // Allow Axios catch block to run
      await Promise.resolve();
      jest.advanceTimersByTime(10000);
    }

    await expect(promise).rejects.toThrow(ThrottlingError);
    expect(mockedAxios.get).toHaveBeenCalledTimes(4);
    jest.useRealTimers();
  });

  it('should NOT retry on 404 status', async () => {
    const error404 = {
      isAxiosStatus: true,
      response: { status: 404 },
      message: 'Not Found',
    };
    mockedAxios.get.mockRejectedValue(error404);
    mockedAxios.isAxiosError.mockReturnValue(true);

    const result = await provider.getAddress('01001000');
    expect(result).toBeNull();
    expect(mockedAxios.get).toHaveBeenCalledTimes(1);
  });
});
