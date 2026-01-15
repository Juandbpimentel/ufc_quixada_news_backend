import { Module } from '@nestjs/common';
import { PrismaModule } from '@/prisma/prisma.module';
import { ArtigosService } from './artigos.service';
import { ArtigosController } from './controllers/artigos.controller';
import { GerenciarArtigosController } from './controllers/gerenciar-artigos.controller';
import { AuthModule } from '@/auth/auth.module';
import { FirebaseStorageService } from '@/storage/firebase-storage.service';
import { ComentariosController } from './controllers/comentarios.controller';
import { ComentariosService } from './comentarios.service';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [
    ArtigosController,
    GerenciarArtigosController,
    ComentariosController,
  ],
  providers: [ArtigosService, FirebaseStorageService, ComentariosService],
  exports: [FirebaseStorageService],
})
export class ArtigosModule {}
