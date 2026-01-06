# ufc_quixada_news_backend

API (NestJS + Prisma + PostgreSQL) para um sistema de jornal/notícias.

- Visitante: acessa apenas rotas públicas de notícias (`/news`).
- Admin: acessa rotas de gerenciamento (`/admin/news`) via autorização por `roles`.

## Como rodar (dev)

1) Configure variáveis de ambiente

- Copie `.env.example` para `.env` e ajuste `DATABASE_URL`.

2) Suba o banco

- `docker compose up -d`

3) Instale dependências

- `npm install`

4) Migração + seed

- `npx prisma migrate dev --name init`
- `npx prisma db seed`

5) Rode a API

- `npm run start:dev`

Swagger: `http://localhost:8080/docs`
