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
        {
          sessoes: {
            some: { texto: { contains: params.busca, mode: 'insensitive' } },
          },
        },
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

  async getUserReaction(usuarioId: number, artigoId: number) {
    const r = await this.prisma.reacao.findFirst({
      where: { usuarioId, artigoId },
    });
    return r ? r.tipo : null;
  }

  /**
   * Returns the reaction record for a given user and article, or null
   * { id, tipo } | null - useful for the frontend to know the specific reaction id
   */
  async getUserReactionRecord(usuarioId: number, artigoId: number) {
    const r = await this.prisma.reacao.findFirst({
      where: { usuarioId, artigoId },
      select: { id: true, tipo: true },
    });
    return r ? { id: r.id, tipo: r.tipo } : null;
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
    const normalized = slugify(slug);
    const article = await this.prisma.artigo.findFirst({
      where: { slug: normalized, publicado: true },
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

  async getBySlugForPreview(slug: string) {
    const normalized = slugify(slug);
    const article = await this.prisma.artigo.findFirst({
      where: { slug: normalized },
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

  async isSlugAvailable(slug: string, ignoreId?: number) {
    const normalized = slugify(slug);
    if (!normalized) return false;
    const found = await this.prisma.artigo.findFirst({
      where: {
        slug: normalized,
        ...(typeof ignoreId === 'number' ? { NOT: { id: ignoreId } } : {}),
      },
      select: { id: true },
    });
    return !found;
  }

  async create(authorId: number, data: CriarArtigoDto): Promise<Artigo> {
    // allow optional custom slug; otherwise generate from title
    const rawSlug =
      typeof data.slug === 'string' && data.slug.trim() !== ''
        ? data.slug
        : data.titulo;
    const baseSlug = slugify(rawSlug);
    if (!baseSlug) throw new BadRequestException('Título/slug inválido');

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

    // if slug provided, normalize and ensure uniqueness
    let nextSlug: string | undefined = undefined;
    if (data.slug) {
      const s = slugify(data.slug);
      if (!s) throw new BadRequestException('Slug inválido');
      const exists = await this.prisma.artigo.findFirst({
        where: { slug: s, NOT: { id } },
      });
      nextSlug = exists ? `${s}-${Date.now()}` : s;
    }

    const updated = await this.prisma.artigo.update({
      where: { id },
      data: {
        titulo: data.titulo,
        resumo: data.resumo,
        slug: nextSlug ?? undefined,
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

  async getById(id: number) {
    const article = await this.prisma.artigo.findUnique({
      where: { id },
      include: { sessoes: { orderBy: { ordem: 'asc' } } },
    });
    if (!article) throw new NotFoundException('Notícia não encontrada');
    const reacoes = await this.getReactionCounts(article.id);
    return { ...article, reacoes };
  }

  async remove(id: number): Promise<Artigo> {
    const existing = await this.prisma.artigo.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Notícia não encontrada');
    return await this.prisma.artigo.delete({ where: { id } });
  }
}
