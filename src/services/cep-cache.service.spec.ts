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
      const cep = '01001000';
      const addressData = { logradouro: 'Sé', localidade: 'SP', uf: 'SP' };
      await service.save(cep, true, addressData as any);
      expect(repository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          cep: '01001000',
          found: true,
          logradouro: 'Sé',
        }),
      );
    });
    it('should save a NOT found status', async () => {
      const cep = '99999999';
      await service.save(cep, false);
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
