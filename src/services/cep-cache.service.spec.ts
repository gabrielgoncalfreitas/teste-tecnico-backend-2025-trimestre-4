import { Test, TestingModule } from '@nestjs/testing';
import { CepCacheService } from './cep-cache.service';
import { CepRepository } from '../repositories/cep.repository';

describe('CepCacheService', () => {
  let service: CepCacheService;
  let repository: jest.Mocked<CepRepository>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CepCacheService,
        {
          provide: CepRepository,
          useValue: {
            findMany: jest.fn(),
            findUnique: jest.fn(),
            create: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get(CepCacheService);
    repository = module.get(CepRepository);
  });

  describe('save', () => {
    it('should save a found address', async () => {
      // Arrange
      const cep = '01001000';
      const addressData = { logradouro: 'Sé', localidade: 'SP', uf: 'SP' };

      // Act
      await service.save(cep, true, addressData as any);

      // Assert
      expect(repository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          cep: '01001000',
          found: true,
          logradouro: 'Sé',
        }),
      );
    });

    it('should save a NOT found status', async () => {
      // Arrange
      const cep = '99999999';

      // Act
      await service.save(cep, false);

      // Assert
      expect(repository.create).toHaveBeenCalledWith({
        cep: '99999999',
        found: false,
      });
    });
  });

  describe('findMethods', () => {
    it('should delegate findMany to repository', async () => {
      await service.findMany(['01000000']);
      expect(repository.findMany).toHaveBeenCalledWith(['01000000']);
    });

    it('should delegate findUnique to repository', async () => {
      await service.findUnique('01000000');
      expect(repository.findUnique).toHaveBeenCalledWith('01000000');
    });
  });
});
