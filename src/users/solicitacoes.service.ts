import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { CriarSolicitacaoDto } from './dto/criar-solicitacao.dto';
import { StatusSolicitacao } from '@prisma/client';

@Injectable()
export class SolicitacoesService {
  constructor(private prisma: PrismaService) {}

  async createOrReopenSolicitacao(usuarioId: number, dto: CriarSolicitacaoDto) {
    const existing = await this.prisma.solicitacao.findUnique({
      where: { usuarioId },
    });

    if (existing) {
      if (existing.status === StatusSolicitacao.PENDENTE) {
        throw new BadRequestException('Já existe uma solicitação pendente');
      }
      if (existing.status === StatusSolicitacao.ACEITA) {
        throw new BadRequestException('Solicitação já aceita');
      }
      // REJEITADA -> reabrir/atualizar
      return this.prisma.solicitacao.update({
        where: { usuarioId },
        data: {
          tipo: dto.tipo,
          mensagem: dto.mensagem,
          status: StatusSolicitacao.PENDENTE,
          atualizadoEm: new Date(),
        },
      });
    }

    return this.prisma.solicitacao.create({
      data: {
        usuarioId,
        tipo: dto.tipo,
        mensagem: dto.mensagem,
      },
    });
  }

  async listOwn(usuarioId: number) {
    return this.prisma.solicitacao.findUnique({ where: { usuarioId } });
  }

  async getById(id: number) {
    return this.prisma.solicitacao.findUnique({ where: { id } });
  }

  async listPendingFor() {
    // visibility rules should be enforced in controller/service that calls this
    return this.prisma.solicitacao.findMany({
      where: { status: StatusSolicitacao.PENDENTE },
    });
  }

  async setStatus(id: number, status: StatusSolicitacao, aprovadorId?: number) {
    const solic = await this.prisma.solicitacao.findUnique({ where: { id } });
    if (!solic) return null;

    const updated = await this.prisma.solicitacao.update({
      where: { id },
      data: {
        status,
        ...(typeof aprovadorId === 'number' ? { aprovadorId } : {}),
      },
    });

    if (status === StatusSolicitacao.ACEITA) {
      const usuarioId = solic.usuarioId;
      if (solic.tipo === 'BOLSISTA') {
        // create bolsista if not exists
        const existing = await this.prisma.bolsista.findUnique({
          where: { usuarioId },
        });
        if (!existing) {
          await this.prisma.bolsista.create({ data: { usuarioId } });
        }
        await this.prisma.usuario.update({
          where: { id: usuarioId },
          data: { papel: 'BOLSISTA' },
        });
      } else if (solic.tipo === 'PROFESSOR') {
        const existing = await this.prisma.professor.findUnique({
          where: { usuarioId },
        });
        if (!existing) {
          await this.prisma.professor.create({ data: { usuarioId } });
        }
        await this.prisma.usuario.update({
          where: { id: usuarioId },
          data: { papel: 'PROFESSOR' },
        });
      } else if (solic.tipo === 'TECNICO') {
        const existing = await this.prisma.tecnicoAdministrativo.findUnique({
          where: { usuarioId },
        });
        if (!existing) {
          await this.prisma.tecnicoAdministrativo.create({
            data: { usuarioId },
          });
        }
        await this.prisma.usuario.update({
          where: { id: usuarioId },
          data: { papel: 'TECNICO_ADMINISTRATIVO' },
        });
      }
    }

    return updated;
  }
}
