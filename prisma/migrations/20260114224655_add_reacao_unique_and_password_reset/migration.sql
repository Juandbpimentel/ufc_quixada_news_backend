-- CreateEnum
CREATE TYPE "Papel" AS ENUM ('ADMINISTRADOR', 'VISITANTE', 'ESTUDANTE', 'BOLSISTA', 'PROFESSOR', 'TECNICO_ADMINISTRATIVO');

-- CreateEnum
CREATE TYPE "CategoriaArtigo" AS ENUM ('EVENTOS', 'OPORTUNIDADES', 'PESQUISA', 'PROJETOS', 'AVISOS', 'OUTROS');

-- CreateEnum
CREATE TYPE "TipoReacao" AS ENUM ('CURTIDA', 'AMEI', 'TRISTE', 'SURPRESO', 'PARABENS');

-- CreateEnum
CREATE TYPE "StatusSolicitacao" AS ENUM ('PENDENTE', 'ACEITA', 'REJEITADA');

-- CreateEnum
CREATE TYPE "SolicitacaoTipo" AS ENUM ('PROFESSOR', 'TECNICO', 'BOLSISTA');

-- CreateEnum
CREATE TYPE "SessaoTipo" AS ENUM ('PARAGRAFO', 'TOPICO', 'IMAGEM');

-- CreateTable
CREATE TABLE "usuarios" (
    "id" SERIAL NOT NULL,
    "login" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "senhaHash" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "papel" "Papel" NOT NULL DEFAULT 'VISITANTE',
    "versaoToken" TEXT NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,
    "isAdmin" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "usuarios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "artigos" (
    "id" SERIAL NOT NULL,
    "titulo" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "resumo" VARCHAR(1000),
    "conteudo" TEXT NOT NULL,
    "categoria" "CategoriaArtigo" NOT NULL,
    "capaUrl" TEXT,
    "publicado" BOOLEAN NOT NULL DEFAULT false,
    "publicadoEm" TIMESTAMP(3),
    "autorId" INTEGER NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "artigos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reacoes" (
    "id" SERIAL NOT NULL,
    "tipo" "TipoReacao" NOT NULL,
    "usuarioId" INTEGER NOT NULL,
    "artigoId" INTEGER NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reacoes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Comentario" (
    "id" SERIAL NOT NULL,
    "conteudo" VARCHAR(500) NOT NULL,
    "autorId" INTEGER NOT NULL,
    "usuarioId" INTEGER NOT NULL,
    "artigoId" INTEGER NOT NULL,
    "comentarioPaiId" INTEGER,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Comentario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "artigo_sessoes" (
    "id" SERIAL NOT NULL,
    "artigoId" INTEGER NOT NULL,
    "ordem" INTEGER NOT NULL,
    "tipo" "SessaoTipo" NOT NULL,
    "texto" VARCHAR(2000),
    "imagemUrl" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "artigo_sessoes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bolsistas" (
    "id" SERIAL NOT NULL,
    "usuarioId" INTEGER NOT NULL,
    "programaBolsista" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bolsistas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "solicitacoes" (
    "id" SERIAL NOT NULL,
    "usuarioId" INTEGER NOT NULL,
    "tipo" "SolicitacaoTipo" NOT NULL,
    "mensagem" TEXT,
    "status" "StatusSolicitacao" NOT NULL DEFAULT 'PENDENTE',
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,
    "aprovadorId" INTEGER,

    CONSTRAINT "solicitacoes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "professores" (
    "id" SERIAL NOT NULL,
    "usuarioId" INTEGER NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "professores_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tecnicos_administrativos" (
    "id" SERIAL NOT NULL,
    "usuarioId" INTEGER NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tecnicos_administrativos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "password_reset_tokens" (
    "id" SERIAL NOT NULL,
    "usuarioId" INTEGER NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "used" BOOLEAN NOT NULL DEFAULT false,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "password_reset_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_login_key" ON "usuarios"("login");

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_email_key" ON "usuarios"("email");

-- CreateIndex
CREATE UNIQUE INDEX "artigos_slug_key" ON "artigos"("slug");

-- CreateIndex
CREATE INDEX "artigos_publicado_publicadoEm_idx" ON "artigos"("publicado", "publicadoEm");

-- CreateIndex
CREATE UNIQUE INDEX "reacoes_usuarioId_artigoId_key" ON "reacoes"("usuarioId", "artigoId");

-- CreateIndex
CREATE INDEX "artigo_sessoes_artigoId_ordem_idx" ON "artigo_sessoes"("artigoId", "ordem");

-- CreateIndex
CREATE UNIQUE INDEX "bolsistas_usuarioId_key" ON "bolsistas"("usuarioId");

-- CreateIndex
CREATE INDEX "solicitacoes_status_idx" ON "solicitacoes"("status");

-- CreateIndex
CREATE UNIQUE INDEX "solicitacoes_usuarioId_key" ON "solicitacoes"("usuarioId");

-- CreateIndex
CREATE UNIQUE INDEX "professores_usuarioId_key" ON "professores"("usuarioId");

-- CreateIndex
CREATE UNIQUE INDEX "tecnicos_administrativos_usuarioId_key" ON "tecnicos_administrativos"("usuarioId");

-- CreateIndex
CREATE UNIQUE INDEX "password_reset_tokens_token_key" ON "password_reset_tokens"("token");

-- CreateIndex
CREATE INDEX "password_reset_tokens_usuarioId_idx" ON "password_reset_tokens"("usuarioId");

-- AddForeignKey
ALTER TABLE "artigos" ADD CONSTRAINT "artigos_autorId_fkey" FOREIGN KEY ("autorId") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reacoes" ADD CONSTRAINT "reacoes_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reacoes" ADD CONSTRAINT "reacoes_artigoId_fkey" FOREIGN KEY ("artigoId") REFERENCES "artigos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Comentario" ADD CONSTRAINT "Comentario_autorId_fkey" FOREIGN KEY ("autorId") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Comentario" ADD CONSTRAINT "Comentario_artigoId_fkey" FOREIGN KEY ("artigoId") REFERENCES "artigos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Comentario" ADD CONSTRAINT "Comentario_comentarioPaiId_fkey" FOREIGN KEY ("comentarioPaiId") REFERENCES "Comentario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "artigo_sessoes" ADD CONSTRAINT "artigo_sessoes_artigoId_fkey" FOREIGN KEY ("artigoId") REFERENCES "artigos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bolsistas" ADD CONSTRAINT "bolsistas_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "solicitacoes" ADD CONSTRAINT "solicitacoes_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "solicitacoes" ADD CONSTRAINT "solicitacoes_aprovadorId_fkey" FOREIGN KEY ("aprovadorId") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "professores" ADD CONSTRAINT "professores_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tecnicos_administrativos" ADD CONSTRAINT "tecnicos_administrativos_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "password_reset_tokens" ADD CONSTRAINT "password_reset_tokens_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;
