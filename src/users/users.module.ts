import { Module } from '@nestjs/common';
import { UsuariosService } from './users.service';
import { UsuariosController } from './controllers/users.controller';
import { AdminUsuariosController } from './controllers/admin-users.controller';
import { SolicitacoesService } from './solicitacoes.service';
import { SolicitacoesController } from './controllers/solicitacoes.controller';
import { PrismaModule } from '@/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [
    UsuariosController,
    AdminUsuariosController,
    SolicitacoesController,
  ],
  providers: [UsuariosService, SolicitacoesService],
  exports: [UsuariosService, SolicitacoesService],
})
export class UsuariosModule {}
