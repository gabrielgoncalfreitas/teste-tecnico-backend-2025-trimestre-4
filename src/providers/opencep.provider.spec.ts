import axios from 'axios';
import { OpenCepProvider } from './opencep.provider';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('OpenCepProvider', () => {
  let provider: OpenCepProvider;

  beforeEach(() => {
    provider = new OpenCepProvider();
    jest.clearAllMocks();
  });

  it('should return address data when request is successful', async () => {
    // Arrange
    const mockData = {
      logradouro: 'Rua Direita',
      localidade: 'São Paulo',
      uf: 'SP',
    };
    mockedAxios.get.mockResolvedValue({ data: mockData });

    // Act
    const result = await provider.getAddress('01001001');

    // Assert
    expect(result).toEqual(mockData);
    expect(mockedAxios.get).toHaveBeenCalledWith(
      'https://opencep.com/v1/01001001.json',
      { timeout: 10000 },
    );
  });

  it('should return null when OpenCEP returns 404', async () => {
    // Arrange
    const error = {
      isAxiosError: true,
      response: { status: 404 },
    };
    mockedAxios.isAxiosError.mockReturnValue(true);
    mockedAxios.get.mockRejectedValue(error);

    // Act
    const result = await provider.getAddress('00000000');

    // Assert
    expect(result).toBeNull();
  });

  it('should return null when request fails with other error', async () => {
    // Arrange
    mockedAxios.get.mockRejectedValue(new Error('Timeout'));

    // Act
    const result = await provider.getAddress('01001000');

    // Assert
    expect(result).toBeNull();
  });
});
