import { AppController } from './app.controller';

describe('AppController', () => {
  let controller: AppController;

  beforeEach(() => {
    controller = new AppController();
  });

  it('ping returns ok', () => {
    expect(controller.ping()).toEqual({ status: 'ok' });
  });
});
