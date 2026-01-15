import { Test } from '@nestjs/testing';
import { SwaggerController } from '@/swagger/swagger.controller';
import { SwaggerDocumentService } from '@/swagger/swagger-document.service';

describe('SwaggerController', () => {
  let controller: SwaggerController;
  const mockDoc = { info: 'ok' };
  const mockService = {
    getDocument: jest.fn().mockReturnValue(mockDoc),
  } as any;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [SwaggerController],
      providers: [{ provide: SwaggerDocumentService, useValue: mockService }],
    }).compile();
    controller = moduleRef.get(SwaggerController);
  });

  it('returns openapi.json document', () => {
    expect(controller.getOpenApi()).toEqual(mockDoc);
    expect(mockService.getDocument).toHaveBeenCalled();
  });
});
