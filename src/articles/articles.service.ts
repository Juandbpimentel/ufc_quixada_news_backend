import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { Article } from '@prisma/client';

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
export class ArticlesService {
  constructor(private prisma: PrismaService) {}

  async listPublic() {
    return await this.prisma.article.findMany({
      where: { published: true },
      orderBy: [{ publishedAt: 'desc' }, { id: 'desc' }],
      select: {
        id: true,
        title: true,
        slug: true,
        summary: true,
        coverUrl: true,
        publishedAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async getPublicBySlug(slug: string) {
    const article = await this.prisma.article.findFirst({
      where: { slug, published: true },
      include: {
        author: { select: { id: true, name: true } },
      },
    });
    if (!article) throw new NotFoundException('Notícia não encontrada');
    return article;
  }

  async listAdmin() {
    return await this.prisma.article.findMany({
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      include: {
        author: { select: { id: true, name: true } },
      },
    });
  }

  async create(authorId: number, data: {
    title: string;
    summary?: string;
    content: string;
    coverUrl?: string;
    published?: boolean;
  }): Promise<Article> {
    const baseSlug = slugify(data.title);
    if (!baseSlug) throw new BadRequestException('Título inválido');

    const existing = await this.prisma.article.findUnique({
      where: { slug: baseSlug },
      select: { id: true },
    });
    const slug = existing ? `${baseSlug}-${Date.now()}` : baseSlug;

    const shouldPublish = data.published === true;
    return await this.prisma.article.create({
      data: {
        title: data.title,
        slug,
        summary: data.summary,
        content: data.content,
        coverUrl: data.coverUrl,
        published: shouldPublish,
        publishedAt: shouldPublish ? new Date() : null,
        authorId,
      },
    });
  }

  async update(id: number, data: {
    title?: string;
    summary?: string;
    content?: string;
    coverUrl?: string;
    published?: boolean;
  }): Promise<Article> {
    const existing = await this.prisma.article.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Notícia não encontrada');

    const nextPublished =
      typeof data.published === 'boolean' ? data.published : existing.published;

    return await this.prisma.article.update({
      where: { id },
      data: {
        title: data.title,
        summary: data.summary,
        content: data.content,
        coverUrl: data.coverUrl,
        published: nextPublished,
        publishedAt:
          nextPublished && !existing.published ? new Date() : existing.publishedAt,
      },
    });
  }

  async remove(id: number): Promise<Article> {
    const existing = await this.prisma.article.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Notícia não encontrada');
    return await this.prisma.article.delete({ where: { id } });
  }
}
