BEGIN;

-- Migrate existing article 'conteudo' into a single PARAGRAFO session
INSERT INTO "artigo_sessoes" ("artigoId", "ordem", "tipo", "texto", "criadoEm", "atualizadoEm")
SELECT id, 0, 'PARAGRAFO', conteudo, now(), now()
FROM "artigos"
WHERE conteudo IS NOT NULL AND conteudo <> '';

-- Remove the old conteudo column
ALTER TABLE "artigos" DROP COLUMN IF EXISTS "conteudo";

COMMIT;