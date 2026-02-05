import { Test, TestingModule } from '@nestjs/testing';
import { AddressService } from './address.service';
import { ViaCepProvider } from '../providers/viacep.provider';
// import { OpenCepProvider } from '../providers/opencep.provider';
describe('AddressService', () => {
  let service: AddressService;
  let viaCep: jest.Mocked<ViaCepProvider>;

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
      ],
    }).compile();
    service = module.get<AddressService>(AddressService);

    // Silence logger
    jest.spyOn(service['logger'], 'error').mockImplementation(() => undefined);
    jest.spyOn(service['logger'], 'warn').mockImplementation(() => undefined);
    viaCep = module.get(ViaCepProvider);
  });
  describe('getAddress', () => {
    it('should return address from ViaCEP if successful', async () => {
      const mockAddress = {
        logradouro: 'Rua A',
        localidade: 'Cidade A',
        uf: 'SP',
      };
      viaCep.getAddress.mockResolvedValue(mockAddress as any);
      const result = await service.getAddress('01001000', 'crawl123');
      expect(result).toEqual(mockAddress);
      expect(viaCep.getAddress).toHaveBeenCalled();
    });

    it('should return null if ViaCEP fails', async () => {
      viaCep.getAddress.mockResolvedValue(null);
      const result = await service.getAddress('01001000');
      expect(result).toBeNull();
    });

    it('should propagate provider errors', async () => {
      viaCep.getAddress.mockRejectedValue(new Error('Network Error'));
      await expect(service.getAddress('01001000', 'crawl123')).rejects.toThrow(
        'Network Error',
      );
      expect(viaCep.getAddress).toHaveBeenCalled();
    });
  });
});
