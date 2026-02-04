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
              upsert: jest.fn(),
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

  it('should search ceps by keyword', async () => {
    const q = 'Sé';
    await repository.searchCeps(q);
    expect(prisma.cep.findMany).toHaveBeenCalledWith({
      where: {
        OR: [
          { logradouro: { contains: q, mode: 'insensitive' } },
          { localidade: { contains: q, mode: 'insensitive' } },
          { uf: { contains: q, mode: 'insensitive' } },
        ],
      },
      select: { cep: true },
    });
  });

  it('should upsert a cep', async () => {
    const data = { cep: '01001000', found: true };
    const mockPromise = Promise.resolve(data);
    (prisma.cep.upsert as jest.Mock).mockReturnValue(mockPromise);

    const result = await repository.create(data);

    expect(result).toEqual(data);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { cep, ...rest } = data;
    expect(prisma.cep.upsert).toHaveBeenCalledWith({
      where: { cep: data.cep },
      create: data,
      update: {
        ...rest,
        updated_at: expect.any(Date),
      },
    });
  });

  it('should throw error if upsert fails', async () => {
    const data = { cep: '01001000', found: true };
    const mockPromise = Promise.reject(new Error('DB Error'));
    (prisma.cep.upsert as jest.Mock).mockReturnValue(mockPromise);

    await expect(repository.create(data)).rejects.toThrow('DB Error');
  });
});
