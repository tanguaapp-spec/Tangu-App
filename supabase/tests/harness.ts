/**
 * Postgres embutido (PGlite) com as migrations reais do projeto aplicadas em
 * ordem — permite testar RLS, triggers e funções sem tocar no Supabase de
 * produção (que hoje é o único ambiente que existe).
 *
 * O que é simulado (stub) e por quê:
 * - schema `auth` (users, uid(), role()) e `storage` (buckets, objects,
 *   foldername()) — no Supabase eles já existem antes das nossas migrations.
 * - papéis anon/authenticated/service_role com os mesmos GRANTs padrão do
 *   Supabase; service_role tem BYPASSRLS, como lá.
 * - PostGIS não roda no PGlite: `geography` vira `text` e ST_* viram funções
 *   vazias. Nenhuma regra de segurança depende de geografia.
 *
 * Limite conhecido: isso valida lógica SQL/RLS, não o comportamento do
 * PostgREST/GoTrue. Comportamento HTTP continua coberto pelos testes E2E.
 */
import { PGlite } from '@electric-sql/pglite'
import { pg_trgm } from '@electric-sql/pglite/contrib/pg_trgm'
import { uuid_ossp } from '@electric-sql/pglite/contrib/uuid_ossp'
import { readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'

const PASTA_MIGRATIONS = path.resolve(__dirname, '..', 'migrations')

const PRE_SUPABASE = `
create role anon nologin;
create role authenticated nologin;
create role service_role nologin bypassrls;

create schema auth;
grant usage on schema auth to anon, authenticated, service_role;
create table auth.users (
  id uuid primary key,
  email text,
  raw_user_meta_data jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);
create function auth.uid() returns uuid language sql stable as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
$$;
create function auth.role() returns text language sql stable as $$
  select coalesce(nullif(current_setting('request.jwt.claim.role', true), ''), current_user::text)
$$;

create schema storage;
grant usage on schema storage to anon, authenticated, service_role;
create table storage.buckets (
  id text primary key,
  name text not null,
  public boolean default false,
  file_size_limit bigint,
  allowed_mime_types text[]
);
create table storage.objects (
  id uuid primary key default gen_random_uuid(),
  bucket_id text references storage.buckets(id),
  name text not null,
  owner uuid,
  metadata jsonb,
  created_at timestamptz default now()
);
alter table storage.objects enable row level security;
grant all on storage.objects to anon, authenticated, service_role;
grant all on storage.buckets to service_role;
create function storage.foldername(name text) returns text[] language sql immutable as $$
  select (string_to_array(name, '/'))[1:array_length(string_to_array(name, '/'), 1) - 1]
$$;

grant usage on schema public to anon, authenticated, service_role;
alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;
alter default privileges in schema public grant execute on functions to anon, authenticated, service_role;

-- stubs PostGIS
create function public.st_makepoint(double precision, double precision) returns text language sql immutable as $$ select null::text $$;
create function public.st_setsrid(text, int) returns text language sql immutable as $$ select $1 $$;
`

function adaptarParaPglite(sql: string) {
  return sql
    .replace(/create extension if not exists postgis;/gi, '')
    .replace(/create extension if not exists "uuid-ossp";/gi, 'create extension if not exists "uuid-ossp";')
    .replace(/geography\(Point, 4326\)/gi, 'text')
    .replace(/::geography/gi, '::text')
    .replace(/using gist\s*\(localizacao\)/gi, 'using btree(localizacao)')
}

function listarMigrations() {
  return readdirSync(PASTA_MIGRATIONS)
    .filter((f) => /^\d{4}_.*\.sql$/.test(f))
    .sort()
}

export async function criarBanco(opcoes: { ate?: string } = {}) {
  const db = await PGlite.create({ extensions: { pg_trgm, uuid_ossp } })
  await db.exec(PRE_SUPABASE)
  for (const arquivo of listarMigrations()) {
    if (opcoes.ate && arquivo > opcoes.ate) break
    const sql = adaptarParaPglite(readFileSync(path.join(PASTA_MIGRATIONS, arquivo), 'utf8'))
    try {
      await db.exec(sql)
    } catch (err) {
      throw new Error(`Falha aplicando ${arquivo}: ${(err as Error).message}`)
    }
  }
  return db
}

export type Banco = Awaited<ReturnType<typeof criarBanco>>

/** Aplica as migrations posteriores a `depoisDe` — pra testar migração sobre dados já existentes. */
export async function aplicarMigrationsDepoisDe(db: Banco, depoisDe: string) {
  for (const arquivo of listarMigrations()) {
    if (arquivo <= depoisDe) continue
    const sql = adaptarParaPglite(readFileSync(path.join(PASTA_MIGRATIONS, arquivo), 'utf8'))
    try {
      await db.exec(sql)
    } catch (err) {
      throw new Error(`Falha aplicando ${arquivo}: ${(err as Error).message}`)
    }
  }
}

/** Cria um usuário como o GoTrue faria (dispara o trigger handle_novo_usuario). */
export async function criarUsuario(db: Banco, metadados: Record<string, unknown> = {}) {
  const { rows } = await db.query<{ id: string }>(
    `insert into auth.users (id, email, raw_user_meta_data) values (gen_random_uuid(), $1, $2) returning id`,
    [`u${Math.random().toString(36).slice(2)}@teste.local`, JSON.stringify({ nome_completo: 'Teste', ...metadados })]
  )
  return rows[0].id
}

/**
 * Executa `fn` como se fosse uma requisição do PostgREST com o JWT desse
 * usuário (role authenticated) — ou anônima, se `usuarioId` for null.
 * Tudo roda numa transação que é desfeita no final só se `desfazer` for true.
 */
export async function como<T>(
  db: Banco,
  usuarioId: string | null,
  fn: (tx: Banco) => Promise<T>
): Promise<T> {
  const papel = usuarioId ? 'authenticated' : 'anon'
  await db.exec('begin')
  try {
    await db.query(`select set_config('request.jwt.claim.sub', $1, true), set_config('request.jwt.claim.role', $2, true)`, [
      usuarioId ?? '',
      papel,
    ])
    await db.exec(`set local role ${papel}`)
    const resultado = await fn(db)
    await db.exec('commit')
    return resultado
  } catch (err) {
    await db.exec('rollback')
    throw err
  }
}

/** Como `como`, mas com a service role (ignora RLS) — o que o servidor usa. */
export async function comoServico<T>(db: Banco, fn: (tx: Banco) => Promise<T>): Promise<T> {
  await db.exec('begin')
  try {
    await db.exec(`select set_config('request.jwt.claim.sub', '', true), set_config('request.jwt.claim.role', 'service_role', true)`)
    await db.exec('set local role service_role')
    const resultado = await fn(db)
    await db.exec('commit')
    return resultado
  } catch (err) {
    await db.exec('rollback')
    throw err
  }
}
