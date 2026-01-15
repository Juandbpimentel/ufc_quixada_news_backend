# ufc_quixada_news_backend

API (NestJS + Prisma + PostgreSQL) para um sistema de jornal/notícias.

- Visitante: acessa apenas rotas públicas de notícias (`/news`).
- Admin: acessa rotas de gerenciamento (`/admin/news` e `/admin/users`) via autorização por `roles`.

Novos papéis e extensões de usuário:

- Papéis adicionados: `ADMINISTRADOR`, `VISITANTE`, `BOLSISTA`, `PROFESSOR`, `TECNICO_ADMINISTRATIVO`.
- Novos modelos: `Bolsista`, `Professor`, `TecnicoAdministrativo` (um-para-um com `Usuario`).

Resumo de acesso:

- Apenas usuários com `BOLSISTA`, `PROFESSOR`, `TECNICO_ADMINISTRATIVO` ou `ADMINISTRADOR` podem criar artigos (endpoint `POST /admin/news`).
- Usuários `ADMINISTRADOR` podem criar usuários com papel e dados de extensão via `POST /admin/users`.

Migração (nota):

Se o DB não estiver rodando, inicie e rode:

- `npx prisma migrate dev --name init --schema prisma/schema.prisma`
- `npx prisma generate`

## Como rodar (dev)

1. Configure variáveis de ambiente

- Copie `.env.example` para `.env` e ajuste `DATABASE_URL`.

2. Suba o banco

- `docker compose up -d`

3. Instale dependências

- `npm install`

4. Migração + seed

- `npx prisma migrate dev --name init`
- `npx prisma db seed`

Nota sobre o seed (admin inicial) 🔐

- O seed agora usa **`ADMIN_LOGIN`** como identificador principal para o usuário admin.
- Configure **`ADMIN_LOGIN`** e **`ADMIN_PASSWORD`** em seu `.env` antes de rodar o seed.
- `ADMIN_EMAIL` é opcional: se não for definido, o seed criará o e-mail padrão `<ADMIN_LOGIN>@ufcnews.com`.
- Exemplo mínimo no `.env`:
  - `ADMIN_LOGIN="admin"`
  - `ADMIN_PASSWORD="adminpass"`

5. Rode a API

- `npm run start:dev`

Swagger: `http://localhost:8080/docs`

---

Important: Content sessions migration

- The `conteudo` field was removed. Existing article content will be migrated into `artigo_sessoes` as a single `PARAGRAFO` session by the new migration.
- To apply locally: `npx prisma migrate dev --name remove-conteudo` (or `npx prisma migrate deploy` in production).

