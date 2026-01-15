import { Test } from '@nestjs/testing';
import { AppController } from '@/app.controller';

describe('AppController', () => {
  let controller: AppController;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [AppController],
    }).compile();
    controller = moduleRef.get(AppController);
  });

  it('health returns ok', () => {
    expect(controller.health()).toEqual({ status: 'ok' });
  });
});
