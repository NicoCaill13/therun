import { Test, TestingModule } from '@nestjs/testing';
import { SpontaneousRunController } from './spontaneous-run.controller';
import { SpontaneousRunService } from './spontaneous-run.service';

describe('SpontaneousRunController', () => {
  let controller: SpontaneousRunController;
  const service = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SpontaneousRunController],
      providers: [{ provide: SpontaneousRunService, useValue: service }],
    }).compile();

    controller = module.get(SpontaneousRunController);
  });

  it('delegates create to service', async () => {
    const dto = {
      creatorId: 'u1',
      locationName: 'Park',
      latitude: 10,
      longitude: 20,
      startTime: '2026-05-06T18:00:00.000Z',
      vibe: 'Easy',
    };
    service.create.mockResolvedValue({ id: 'r1' } as never);
    await controller.create(dto);
    expect(service.create).toHaveBeenCalledWith(dto);
  });

  it('delegates findAll to service', async () => {
    service.findAll.mockResolvedValue([] as never);
    await controller.findAll();
    expect(service.findAll).toHaveBeenCalledWith();
  });

  it('delegates update to service', async () => {
    service.update.mockResolvedValue({ id: 'r1' } as never);
    await controller.update('r1', { vibe: 'Tempo' });
    expect(service.update).toHaveBeenCalledWith('r1', { vibe: 'Tempo' });
  });

  it('delegates remove to service', async () => {
    service.remove.mockResolvedValue(undefined);
    await controller.remove('r1');
    expect(service.remove).toHaveBeenCalledWith('r1');
  });
});
