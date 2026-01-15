import { Module } from '@nestjs/common';
import { PrismaModule } from '@/prisma/prisma.module';
import { AuthModule } from '@/auth/auth.module';
import { UsuariosModule } from '@/users/users.module';
import { ArtigosModule } from '@/artigos/artigos.module';
import { AppController } from './app.controller';
import { SwaggerDocumentService } from './swagger/swagger-document.service';
import { SwaggerController } from './swagger/swagger.controller';

@Module({
  imports: [PrismaModule, AuthModule, UsuariosModule, ArtigosModule],
  controllers: [AppController, SwaggerController],
  providers: [SwaggerDocumentService],
})
export class AppModule {}
