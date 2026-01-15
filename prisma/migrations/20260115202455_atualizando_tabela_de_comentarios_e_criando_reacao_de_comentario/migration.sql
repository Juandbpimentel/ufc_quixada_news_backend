/*
  Warnings:

  - You are about to drop the `Comentario` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "TipoReacaoComentario" AS ENUM ('GOSTEI', 'NAO_GOSTEI');

-- DropForeignKey
ALTER TABLE "Comentario" DROP CONSTRAINT "Comentario_artigoId_fkey";

-- DropForeignKey
ALTER TABLE "Comentario" DROP CONSTRAINT "Comentario_autorId_fkey";

-- DropForeignKey
ALTER TABLE "Comentario" DROP CONSTRAINT "Comentario_comentarioPaiId_fkey";

-- DropTable
DROP TABLE "Comentario";

-- CreateTable
CREATE TABLE "comentario_reacoes" (
    "id" SERIAL NOT NULL,
    "tipo" "TipoReacaoComentario" NOT NULL,
    "usuarioId" INTEGER NOT NULL,
    "comentarioId" INTEGER NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "comentario_reacoes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "comentarios" (
    "id" SERIAL NOT NULL,
    "conteudo" VARCHAR(500) NOT NULL,
    "autorId" INTEGER NOT NULL,
    "usuarioId" INTEGER NOT NULL,
    "artigoId" INTEGER NOT NULL,
    "comentarioPaiId" INTEGER,
    "respondeAId" INTEGER,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "comentarios_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "comentario_reacoes_usuarioId_comentarioId_key" ON "comentario_reacoes"("usuarioId", "comentarioId");

-- AddForeignKey
ALTER TABLE "comentario_reacoes" ADD CONSTRAINT "comentario_reacoes_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comentario_reacoes" ADD CONSTRAINT "comentario_reacoes_comentarioId_fkey" FOREIGN KEY ("comentarioId") REFERENCES "comentarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comentarios" ADD CONSTRAINT "comentarios_autorId_fkey" FOREIGN KEY ("autorId") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comentarios" ADD CONSTRAINT "comentarios_artigoId_fkey" FOREIGN KEY ("artigoId") REFERENCES "artigos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comentarios" ADD CONSTRAINT "comentarios_comentarioPaiId_fkey" FOREIGN KEY ("comentarioPaiId") REFERENCES "comentarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;
