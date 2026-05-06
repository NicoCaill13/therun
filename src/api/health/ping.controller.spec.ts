import { Test, TestingModule } from '@nestjs/testing';
import { PingController } from './ping.controller';

describe('PingController', () => {
  let controller: PingController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PingController],
    }).compile();

    controller = module.get(PingController);
  });

  it('returns ok status', () => {
    expect(controller.ping()).toEqual({ status: 'ok' });
  });
});
