# KudiaMap API

API REST para centralizar informações de restaurantes, hamburgarias e pizzarias, permitindo:

- cadastro de usuários e lojas;
- pesquisa de produtos;
- comparação de preços;
- geolocalização de lojas próximas;
- publicações promocionais, avaliações e favoritos.

## Stack

- Node.js + Express
- MongoDB Atlas + Mongoose
- Swagger (OpenAPI) para documentação
- JWT para autenticação

## Mapeamento do modelo SQL para MongoDB

As tabelas propostas foram modeladas em coleções com referência entre documentos:

- `Users` -> coleção `users` (modelo `User`)
- `Lojas` -> coleção `stores` (modelo `Store`, com `owner` referenciando `User`)
- `Menus` -> coleção `menuitems` (modelo `MenuItem`, com `store`)
- `Posts` -> coleção `posts` (modelo `Post`, com `store`)
- `Avaliacoes` -> coleção `reviews` (modelo `Review`, com `user` e `store`)
- `Favoritos` -> coleção `favorites` (modelo `Favorite`, com `user` e `store`)

Para geolocalização, `Store` usa `location` em formato GeoJSON e índice `2dsphere`.

## Requisitos

- Node.js 18+
- MongoDB Atlas (ou Mongo local para desenvolvimento)

## Configuração

1. Copie `.env.example` para `.env`.
2. Ajuste `MONGODB_URI` e `JWT_SECRET`.
3. Para upload de imagens, configure o Cloudinary:
	- `CLOUDINARY_CLOUD_NAME`
	- `CLOUDINARY_API_KEY`
	- `CLOUDINARY_API_SECRET`

## Executar

```powershell
npm install
npm run dev
```

Servidor: `http://localhost:3000`

Swagger: `http://localhost:3000/api/docs`

Painel Admin UI: `http://localhost:3000/admin`

## Deploy na Vercel

O projeto já está preparado para Vercel com `vercel.json` e função serverless em `api/index.js`.

### Variáveis obrigatórias na Vercel

- `MONGODB_URI`
- `JWT_SECRET`
- `JWT_EXPIRES_IN`
- `CLOUDINARY_CLOUD_NAME`
- `CLOUDINARY_API_KEY`
- `CLOUDINARY_API_SECRET`

### URLs após deploy

- Swagger UI: `/api/docs`
- JSON da documentação: `/api/docs.json`

Se `/api/docs` abrir em branco, valide primeiro se `/api/docs.json` retorna JSON corretamente.

## Testes

```powershell
npm test
```

## Seeders (dados de teste)

O projeto inclui seed para todas as coleções:

- `Users`
- `Store`
- `MenuItem`
- `Posts`
- `Review`
- `Favorite`

Executar seed (somente banco vazio):

```powershell
npm.cmd run seed
```

Resetar e recriar todos os dados de teste:

```powershell
npm.cmd run seed:reset
```

Usuários padrão criados (senha: `123456`):

- Admin: `admin@kudiamap.com`
- Lojas: `owner.burger@kudiamap.com`, `owner.pizza@kudiamap.com`, `owner.grill@kudiamap.com`
- Clientes: `ana@kudiamap.com`, `carlos@kudiamap.com`, `joana@kudiamap.com`, `mateus@kudiamap.com`

## Endpoints principais

### Auth

- `POST /api/auth/register`
- `POST /api/auth/login`

### Lojas

- `POST /api/stores` (LOJA autenticada)
- `GET /api/stores`
- `GET /api/stores/me/has-store` (LOJA autenticada, verifica se já possui loja)
- `GET /api/stores/me/dashboard` (LOJA autenticada, métricas completas do dashboard da loja)
- `GET /api/stores/user/:userId/has-store` (LOJA/ADMIN autenticado, verifica por id do usuário)
- `GET /api/stores/:id?onlyAvailable=true` (detalhes da loja com menus)
- `GET /api/stores/nearby?lat=-8.83&lng=13.24&radiusKm=5`

### Produtos (Menu)

- `POST /api/menus` (LOJA autenticada, suporta upload de imagem no cadastro via multipart/form-data)
- `GET /api/menus/:id` (detalhes completos do item + loja + métricas + relacionados)
- `PATCH /api/menus/:id` (editar item do menu)
- `PATCH /api/menus/:id/image` (upload de imagem para Cloudinary, multipart/form-data)
- `GET /api/menus/search?q=x-burger&category=Hamburguer&minPrice=1000&maxPrice=3000`
- `GET /api/menus/compare?name=x-burger`

### Extras

- `POST /api/posts` / `GET /api/posts`
- `POST /api/reviews` / `GET /api/reviews/store/:storeId`
- `POST /api/favorites` / `GET /api/favorites/mine` / `DELETE /api/favorites/:storeId`

### Admin (Gestão profissional de Posts)

- `GET /api/admin/posts` (paginação, filtros e busca)
- `GET /api/admin/posts/:id`
- `PATCH /api/admin/posts/:id` (edição editorial)
- `PATCH /api/admin/posts/:id/moderate` (publish/archive/restore/delete)

> Todos endpoints de `/api/admin/*` exigem usuário com tipo `ADMIN`.

## Boas práticas aplicadas no módulo Admin de Posts

- RBAC por perfil (`ADMIN`) para área sensível.
- Moderação com histórico (`reviewedBy`, `reviewedAt`, `reason`).
- Soft delete (`isDeleted`, `deletedAt`) para evitar perda definitiva acidental.
- Status de ciclo de vida (`DRAFT`, `PUBLISHED`, `ARCHIVED`).
- Paginação e filtros para operação em escala.
- Restrições de cadastro público impedindo criação indevida de `ADMIN`.

## Painel Admin (UI moderna)

O projeto inclui uma interface web administrativa em `src/public/admin` para facilitar a gestão operacional.

Funcionalidades atuais:

- visão geral com métricas do sistema (`users`, `stores`, `products`, `posts`);
- filtros de posts por estado e busca textual;
- paginação para gestão em escala;
- ações rápidas de moderação (publicar, arquivar, restaurar e remover).

Fluxo:

1. faça login como `ADMIN` em `POST /api/auth/login`;
2. copie o token JWT retornado;
3. abra `http://localhost:3000/admin`, cole o token e clique em **Conectar**.

## Próximos passos recomendados

- adicionar paginação e cache para busca de menus;
- adicionar transformação automática de imagens (thumbnails) no Cloudinary;
- criar endpoint de analytics para ajudar na identificação contínua das necessidades dos usuários;
- adicionar testes de integração para rotas de geolocalização e comparação de preços.