import { Test, TestingModule } from '@nestjs/testing';
import { CepRepository } from './cep.repository';
import { PrismaService } from '../services/prisma.service';
describe('CepRepository', () => {
  let repository: CepRepository;
  let prisma: jest.Mocked<PrismaService>;
  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CepRepository,
        {
          provide: PrismaService,
          useValue: {
            cep: {
              findMany: jest.fn(),
              findUnique: jest.fn(),
              create: jest.fn(),
            },
          },
        },
      ],
    }).compile();
    repository = module.get(CepRepository);
    prisma = module.get(PrismaService);
  });
  it('should findMany ceps', async () => {
    const ceps = ['01001000'];
    await repository.findMany(ceps);
    expect(prisma.cep.findMany).toHaveBeenCalledWith({
      where: { cep: { in: ceps } },
    });
  });
  it('should findUnique cep', async () => {
    await repository.findUnique('01001000');
    expect(prisma.cep.findUnique).toHaveBeenCalledWith({
      where: { cep: '01001000' },
    });
  });
  it('should create a cep', async () => {
    const data = { cep: '01001000', found: true };
    const mockPromise = Promise.resolve(data);
    (prisma.cep.create as jest.Mock).mockReturnValue(mockPromise);
    const result = await repository.create(data);
    expect(result).toEqual(data);
    expect(prisma.cep.create).toHaveBeenCalledWith({ data });
  });
  it('should handle error in create and return undefined', async () => {
    const data = { cep: '01001000', found: true };
    const mockPromise = Promise.reject(new Error('Duplicate'));
    (prisma.cep.create as jest.Mock).mockReturnValue(mockPromise);
    const result = await repository.create(data);
    expect(result).toBeUndefined();
  });
});
