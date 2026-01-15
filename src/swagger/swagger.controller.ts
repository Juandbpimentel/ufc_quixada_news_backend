import { Controller, Get } from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import { SwaggerDocumentService } from './swagger-document.service';

@ApiExcludeController()
@Controller()
export class SwaggerController {
  constructor(private readonly swaggerDoc: SwaggerDocumentService) {}

  @Get('openapi.json')
  getOpenApi() {
    return this.swaggerDoc.getDocument() ?? {};
  }
}
