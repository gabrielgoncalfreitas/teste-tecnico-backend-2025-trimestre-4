import { Test, TestingModule } from '@nestjs/testing';
import { AddressService } from './address.service';
import { ViaCepProvider } from '../providers/viacep.provider';
import { OpenCepProvider } from '../providers/opencep.provider';

describe('AddressService', () => {
  let service: AddressService;
  let viaCep: jest.Mocked<ViaCepProvider>;
  let openCep: jest.Mocked<OpenCepProvider>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AddressService,
        {
          provide: ViaCepProvider,
          useValue: {
            getAddress: jest.fn(),
            getName: jest.fn().mockReturnValue('ViaCEP'),
          },
        },
        {
          provide: OpenCepProvider,
          useValue: {
            getAddress: jest.fn(),
            getName: jest.fn().mockReturnValue('OpenCEP'),
          },
        },
      ],
    }).compile();

    service = module.get(AddressService);
    viaCep = module.get(ViaCepProvider);
    openCep = module.get(OpenCepProvider);
  });

  describe('getAddress', () => {
    it('should return address from ViaCEP if successful', async () => {
      // Arrange
      const mockAddress = {
        logradouro: 'Rua A',
        localidade: 'Cidade A',
        uf: 'SP',
      };
      viaCep.getAddress.mockResolvedValue(mockAddress as any);

      // Act
      const result = await service.getAddress('01001000');

      // Assert
      expect(result).toEqual(mockAddress);
      expect(viaCep.getAddress).toHaveBeenCalled();
      expect(openCep.getAddress).not.toHaveBeenCalled();
    });

    it('should try OpenCEP if ViaCEP fails', async () => {
      // Arrange
      const mockAddress = {
        logradouro: 'Rua B',
        localidade: 'Cidade B',
        uf: 'RJ',
      };
      viaCep.getAddress.mockResolvedValue(null);
      openCep.getAddress.mockResolvedValue(mockAddress as any);

      // Act
      const result = await service.getAddress('01001000');

      // Assert
      expect(result).toEqual(mockAddress);
      expect(viaCep.getAddress).toHaveBeenCalled();
      expect(openCep.getAddress).toHaveBeenCalled();
    });

    it('should return null if all providers fail', async () => {
      // Arrange
      viaCep.getAddress.mockResolvedValue(null);
      openCep.getAddress.mockResolvedValue(null);

      // Act
      const result = await service.getAddress('01001000');

      // Assert
      expect(result).toBeNull();
    });

    it('should catch and log provider errors and continue', async () => {
      // Arrange
      viaCep.getAddress.mockRejectedValue(new Error('Network Error'));
      openCep.getAddress.mockResolvedValue({ logradouro: 'Rua B' } as any);

      // Act
      const result = await service.getAddress('01001000');

      // Assert
      expect(result).toEqual({ logradouro: 'Rua B' });
      expect(viaCep.getAddress).toHaveBeenCalled();
      expect(openCep.getAddress).toHaveBeenCalled();
    });
  });
});
