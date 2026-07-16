# Tanguá App 🍊

Plataforma web da cidade de Tanguá-RJ: diretório de profissionais e comércios locais,
vagas de emprego e mural da cidade. Construído com **Next.js 14 (App Router)**,
**Supabase** (banco + autenticação + storage) e estilizado com **Tailwind CSS**.

## Stack

- **Frontend/Backend**: Next.js 14 (App Router, Server Actions, Server Components)
- **Banco de dados**: PostgreSQL via Supabase (com PostGIS para geolocalização)
- **Autenticação**: Supabase Auth (e-mail/senha)
- **Estilo**: Tailwind CSS com paleta customizada "Terra da Laranja"
- **Deploy**: Vercel

---

## 1. Configurando o Supabase

1. Crie um projeto em [supabase.com](https://supabase.com).
2. No **SQL Editor**, cole e execute o conteúdo de `supabase/migrations/0001_schema_inicial.sql`.
   Isso cria todas as tabelas, políticas de segurança (RLS) e categorias iniciais.
3. Em **Project Settings > API**, copie:
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` → `SUPABASE_SERVICE_ROLE_KEY` (⚠️ nunca exponha esta no frontend)
4. Em **Authentication > Email Templates**, personalize se quiser os e-mails de
   confirmação de cadastro.
5. (Opcional) Em **Storage**, crie um bucket público chamado `imagens` para fotos
   enviadas por profissionais (capa, galeria, posts).

### Tornar seu usuário admin

Depois de se cadastrar pelo app, rode no SQL Editor:

```sql
update public.perfis set papel = 'admin' where id = 'SEU-USER-ID-AQUI';
```

(Encontre o UUID em **Authentication > Users**.)

---

## 2. Rodando localmente

```bash
npm install
cp .env.example .env.local
# preencha .env.local com suas chaves do Supabase
npm run dev
```

Acesse `http://localhost:3000`.

---

## 3. Importando negócios do Google Places

⚠️ **Leia o aviso legal no topo de `scripts/importar-google-places.ts` antes de rodar
em produção** — os Termos de Serviço do Google Places restringem armazenamento
permanente de alguns campos. Vale revisar com atenção (ou com um advogado) antes
de usar isso como base do seu diretório público.

1. Ative a **Places API** no [Google Cloud Console](https://console.cloud.google.com/).
2. Gere uma API Key e adicione em `.env.local` como `GOOGLE_PLACES_API_KEY`.
3. Ajuste o centro de busca (`CENTRO_TANGUA`) e o raio (`RAIO_METROS`) no script
   se necessário.
4. Rode:

```bash
npm run seed:places
```

O script busca por categorias (restaurantes, salões, oficinas, etc.), evita
duplicar `google_place_id` já importados, e salva tudo como "não verificado"
até que o profissional reivindique o perfil.

---

## 4. Deploy na Vercel

1. Suba este repositório para o GitHub/GitLab.
2. Em [vercel.com](https://vercel.com), importe o repositório.
3. Em **Environment Variables**, adicione:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY` (apenas se for rodar importações via Vercel Cron/API route)
4. Deploy. A Vercel detecta Next.js automaticamente.

---

## 5. Estrutura de pastas

```
app/
  (public)/        → páginas públicas (home, busca, vagas, mural, negócio/[id])
  (auth)/          → login e cadastro
  painel/          → área logada (profissional e admin)
components/
  ui/              → botão, campo, selo (design system)
  layout/          → cabeçalho, rodapé
  negocio/         → cards de negócio, vaga, aviso
  painel/          → formulários da área logada
lib/
  supabase/        → clientes Supabase (browser, server, middleware)
  queries/         → funções de leitura de dados
  actions/         → Server Actions (escrita de dados)
  types/           → tipos TypeScript do banco
scripts/
  importar-google-places.ts → importação inicial via Google Places API
supabase/migrations/        → schema SQL versionado
```

---

## 6. Papéis de usuário

- **morador**: busca, favorita, avalia.
- **profissional**: tudo acima + reivindica e gerencia seu negócio, publica posts.
- **admin**: aprova reivindicações, publica vagas e avisos no mural, modera conteúdo.

---

## 7. Próximos passos sugeridos

Veja a seção "Melhorias futuras" na conversa com o Claude que gerou este projeto
para um roteiro completo de evolução do produto e monetização.
