import { Test, TestingModule } from '@nestjs/testing';
import { HealthController } from './health.controller';
import { WorkerRepository } from '../repositories/worker.repository';

describe('HealthController', () => {
  let controller: HealthController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        {
          provide: WorkerRepository,
          useValue: {
            getActiveWorkers: jest.fn(),
          },
        },
      ],
    }).compile();
    controller = module.get<HealthController>(HealthController);
  });
  describe('check', () => {
    it('should return status OK and a timestamp', () => {
      const result = controller.check();
      expect(result.status).toBe('OK');
      expect(result.timestamp).toBeDefined();
      expect(new Date(result.timestamp).getTime()).not.toBeNaN();
    });
  });
});
