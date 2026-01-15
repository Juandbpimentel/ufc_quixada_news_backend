import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { Artigo, CategoriaArtigo, Prisma } from '@prisma/client';
import { FirebaseStorageService } from '@/storage/firebase-storage.service';
import { CriarArtigoDto } from './dtos/criar-artigo.dto';
import { AtualizarArtigoDto } from './dtos/atualizar-artigo.dto';

type ArtigoWithSessions = Artigo & {
  sessoes: import('@prisma/client').ArtigoSessao[];
};

function slugify(input: string): string {
  return input
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '');
}

@Injectable()
export class ArtigosService {
  constructor(
    private prisma: PrismaService,
    private storage: FirebaseStorageService,
  ) {}

  private buildWhere(params?: {
    busca?: string;
    autorId?: number;
    categoria?: CategoriaArtigo;
    dataInicial?: Date;
    dataFinal?: Date;
    publicado?: boolean;
  }): Prisma.ArtigoWhereInput {
    const where: Prisma.ArtigoWhereInput = {};
    if (typeof params?.publicado === 'boolean') {
      where.publicado = params.publicado;
    }
    if (params?.busca) {
      where.OR = [
        { titulo: { contains: params.busca, mode: 'insensitive' } },
        { resumo: { contains: params.busca, mode: 'insensitive' } },
        { conteudo: { contains: params.busca, mode: 'insensitive' } },
      ];
    }
    if (typeof params?.autorId === 'number') {
      where.autorId = params.autorId;
    }
    if (typeof params?.categoria === 'string') {
      where.categoria = params.categoria;
    }
    if (params?.dataInicial || params?.dataFinal) {
      where.publicadoEm = {};
      if (params.dataInicial) where.publicadoEm.gte = params.dataInicial;
      if (params.dataFinal) where.publicadoEm.lte = params.dataFinal;
    }
    return where;
  }

  async listByPage(params?: {
    take?: number;
    pagina?: number;
    busca?: string;
    autorId?: number;
    categoria?: CategoriaArtigo;
    dataInicial?: Date;
    dataFinal?: Date;
    publicado?: boolean;
  }) {
    const take = params?.take ?? 3;
    const takePlusOne = take + 1;
    const where = this.buildWhere(params);

    const pagina = Math.max(1, Math.floor(params?.pagina ?? 1));
    const skip = (pagina - 1) * take;
    const records = await this.prisma.artigo.findMany({
      where,
      orderBy: [{ publicadoEm: 'desc' }, { id: 'desc' }],
      skip,
      take: takePlusOne,
    });

    let nextPage: number | null = null;
    if (records.length > take) {
      records.pop();
      nextPage = pagina + 1;
    }

    // attach reaction counts to each article
    const items = await Promise.all(
      records.map(async (r) => ({
        ...r,
        reacoes: await this.getReactionCounts(r.id),
      })),
    );

    return { items, nextCursor: null, nextPage };
  }

  async listByCursor(params?: {
    take?: number;
    cursorId?: number;
    busca?: string;
    autorId?: number;
    categoria?: CategoriaArtigo;
    dataInicial?: Date;
    dataFinal?: Date;
    publicado?: boolean;
  }) {
    const take = params?.take ?? 3;
    const takePlusOne = take + 1;
    const where = this.buildWhere(params);

    const findArgs: Prisma.ArtigoFindManyArgs = {
      where,
      orderBy: [{ publicadoEm: 'desc' }, { id: 'desc' }],
      take: takePlusOne,
    };

    if (params?.cursorId) {
      findArgs.cursor = { id: params.cursorId };
      findArgs.skip = 1;
    }

    const records = await this.prisma.artigo.findMany(findArgs);

    let nextCursor: number | null = null;
    if (records.length > take) {
      const last = records.pop();
      nextCursor = last === undefined ? null : last.id;
    }

    // attach reaction counts
    const items = await Promise.all(
      records.map(async (r) => ({
        ...r,
        reacoes: await this.getReactionCounts(r.id),
      })),
    );

    return { items, nextCursor, nextPage: null };
  }

  // Reactions
  async createReaction(
    usuarioId: number,
    artigoId: number,
    tipo: import('@prisma/client').TipoReacao,
  ) {
    // comportamento 'setReaction': se já existir reação do usuário para o artigo, atualiza o tipo; senão cria
    const existing = await this.prisma.reacao.findFirst({
      where: { usuarioId, artigoId },
    });
    if (existing) {
      return this.prisma.reacao.update({
        where: { id: existing.id },
        data: { tipo },
      });
    }
    return this.prisma.reacao.create({
      data: { usuarioId, artigoId, tipo },
    });
  }

  async getReactionById(reacaoId: number) {
    return this.prisma.reacao.findUnique({ where: { id: reacaoId } });
  }

  async deleteReaction(reacaoId: number) {
    return this.prisma.reacao.delete({ where: { id: reacaoId } });
  }

  async deleteReactionByUser(usuarioId: number, artigoId: number) {
    const r = await this.prisma.reacao.findFirst({
      where: { usuarioId, artigoId },
    });
    if (!r) return { ok: false };
    await this.prisma.reacao.delete({ where: { id: r.id } });
    return { ok: true };
  }

  async getReactionCounts(artigoId: number) {
    const groups = await this.prisma.reacao.groupBy({
      by: ['tipo'],
      where: { artigoId },
      _count: { tipo: true },
    });
    const result: Record<string, number> = {};
    groups.forEach((g) => (result[g.tipo] = g._count.tipo ?? 0));
    return result;
  }

  async list(params?: {
    take?: number;
    cursorId?: number;
    pagina?: number;
    busca?: string;
    autorId?: number;
    categoria?: CategoriaArtigo;
    dataInicial?: Date;
    dataFinal?: Date;
    publicado?: boolean;
  }) {
    if (typeof params?.pagina === 'number') {
      return this.listByPage(params);
    }
    return this.listByCursor(params);
  }

  async getPublicBySlug(slug: string) {
    const article = await this.prisma.artigo.findFirst({
      where: { slug, publicado: true },
      include: {
        autor: { select: { id: true, nome: true } },
        sessoes: { orderBy: { ordem: 'asc' } },
      },
    });
    if (!article) throw new NotFoundException('Notícia não encontrada');

    const reacoes = await this.getReactionCounts(article.id);
    return { ...article, reacoes } as ArtigoWithSessions & {
      reacoes?: Record<string, number>;
    };
  }

  async create(authorId: number, data: CriarArtigoDto): Promise<Artigo> {
    const baseSlug = slugify(data.titulo);
    if (!baseSlug) throw new BadRequestException('Título inválido');

    const existing = await this.prisma.artigo.findUnique({
      where: { slug: baseSlug },
      select: { id: true },
    });
    const slug = existing ? `${baseSlug}-${Date.now()}` : baseSlug;

    const shouldPublish = data.publicado === true;
    const article = await this.prisma.artigo.create({
      data: {
        titulo: data.titulo,
        slug,
        resumo: data.resumo,
        conteudo: data.conteudo,
        capaUrl: data.capaUrl,
        categoria: data.categoria,
        publicado: shouldPublish,
        publicadoEm: shouldPublish ? new Date() : null,
        autorId: authorId,
      },
      include: { sessoes: true },
    });

    // create sessions if provided
    if (Array.isArray(data.artigoSessoes) && data.artigoSessoes.length > 0) {
      const sessoesData: Array<any> = [];
      for (let i = 0; i < data.artigoSessoes.length; i++) {
        const s = data.artigoSessoes[i];
        let imagemUrl = s.imagemUrl;

        // if data URL, upload to firebase (if configured)
        if (typeof imagemUrl === 'string' && imagemUrl.startsWith('data:')) {
          if (!this.storage.isConfigured()) {
            throw new Error(
              'Envie URL pública ou configure o Firebase Storage',
            );
          }
          const ext =
            (imagemUrl.match(/^data:(.+);base64,/) || [])[1] || 'image/jpeg';
          const extClean = ext.split('/')[1] || 'jpg';
          const dest = `artigos/${article.id}/sessoes/${Date.now()}-${i}.${extClean}`;
          imagemUrl = await this.storage.uploadBase64(imagemUrl, dest);
        }

        sessoesData.push({
          artigoId: article.id,
          ordem: s.ordem,
          tipo: s.tipo,
          texto: s.texto,
          imagemUrl,
        });
      }

      await this.prisma.artigoSessao.createMany({ data: sessoesData });
    }

    // return article with sessions ordered
    const full = await this.prisma.artigo.findUnique({
      where: { id: article.id },
      include: { sessoes: { orderBy: { ordem: 'asc' } } },
    });
    return full as ArtigoWithSessions;
  }

  async update(id: number, data: AtualizarArtigoDto): Promise<Artigo> {
    const existing = await this.prisma.artigo.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Notícia não encontrada');

    const nextPublished =
      typeof data.publicado === 'boolean' ? data.publicado : existing.publicado;

    const updated = await this.prisma.artigo.update({
      where: { id },
      data: {
        titulo: data.titulo,
        resumo: data.resumo,
        conteudo: data.conteudo,
        capaUrl: data.capaUrl,
        publicado: nextPublished,
        categoria: data.categoria,
        publicadoEm:
          nextPublished && !existing.publicado
            ? new Date()
            : existing.publicadoEm,
      },
    });

    // replace sessions if provided
    if (Array.isArray(data.artigoSessoes)) {
      // delete existing and recreate according to provided order
      await this.prisma.artigoSessao.deleteMany({ where: { artigoId: id } });
      if (data.artigoSessoes.length > 0) {
        const sessoesData: Array<any> = [];
        for (let i = 0; i < data.artigoSessoes.length; i++) {
          const s = data.artigoSessoes[i];
          let imagemUrl = s.imagemUrl;

          if (typeof imagemUrl === 'string' && imagemUrl.startsWith('data:')) {
            if (!this.storage.isConfigured()) {
              throw new Error(
                'Envie URL pública ou configure o Firebase Storage',
              );
            }
            const ext =
              (imagemUrl.match(/^data:(.+);base64,/) || [])[1] || 'image/jpeg';
            const extClean = ext.split('/')[1] || 'jpg';
            const dest = `artigos/${id}/sessoes/${Date.now()}-${i}.${extClean}`;
            imagemUrl = await this.storage.uploadBase64(imagemUrl, dest);
          }

          sessoesData.push({
            artigoId: id,
            ordem: s.ordem,
            tipo: s.tipo,
            texto: s.texto,
            imagemUrl,
          });
        }
        await this.prisma.artigoSessao.createMany({ data: sessoesData });
      }
    }

    return updated;
  }

  async remove(id: number): Promise<Artigo> {
    const existing = await this.prisma.artigo.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Notícia não encontrada');
    return await this.prisma.artigo.delete({ where: { id } });
  }
}
