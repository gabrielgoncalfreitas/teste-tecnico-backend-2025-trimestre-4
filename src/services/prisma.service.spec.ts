import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from './prisma.service';
import { ConfigService } from '@nestjs/config';
describe('PrismaService', () => {
  let service: PrismaService;
  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PrismaService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockReturnValue('mongodb://localhost:27017/test'),
          },
        },
      ],
    }).compile();
    service = module.get<PrismaService>(PrismaService);
    // Mock PrismaClient methods
    (service as any).$connect = jest.fn();
    (service as any).$disconnect = jest.fn();
  });
  it('should connect on module init', async () => {
    await service.onModuleInit();
    expect(service.$connect).toHaveBeenCalled();
  });
  it('should disconnect on module destroy', async () => {
    await service.onModuleDestroy();
    expect(service.$disconnect).toHaveBeenCalled();
  });
});
