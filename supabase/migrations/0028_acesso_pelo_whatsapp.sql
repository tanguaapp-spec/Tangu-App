-- =====================================================================
-- 0028 — Recuperar o acesso pelo WhatsApp
-- =====================================================================
-- Só acrescenta. Pode rodar já e mais de uma vez.
--
-- Quem não recebe o e-mail de nova senha pede pelo app. O time recebe o
-- pedido e, com um toque, manda um link exclusivo de nova senha para o
-- WhatsApp que JÁ está na conta (ou no negócio dela). O link em si nunca é
-- guardado: é gerado na hora do envio e vale 1 hora, uma vez.
-- =====================================================================

create table if not exists public.pedidos_acesso (
  id uuid primary key default uuid_generate_v4(),
  perfil_id uuid not null references public.perfis(id) on delete cascade,
  status text not null default 'pendente' check (status in ('pendente', 'enviado', 'cancelado')),
  enviado_por uuid references public.perfis(id) on delete set null,
  enviado_em timestamptz,
  criado_em timestamptz not null default now()
);
create index if not exists pedidos_acesso_status_idx on public.pedidos_acesso(status, criado_em);
-- um pedido aberto por conta (pedir de novo não duplica a fila)
create unique index if not exists pedidos_acesso_pendente_idx on public.pedidos_acesso(perfil_id) where status = 'pendente';

-- só o servidor (service role) lê e grava
alter table public.pedidos_acesso enable row level security;
revoke all on public.pedidos_acesso from anon, authenticated;

-- e-mail mora no Auth; o servidor precisa achar a conta sem listar todo mundo
create or replace function public.perfil_id_por_email(p_email text)
returns uuid
language sql stable security definer set search_path = public, auth
as $$
  select id from auth.users where lower(email) = lower(trim(p_email)) limit 1
$$;
revoke all on function public.perfil_id_por_email(text) from public, anon, authenticated;
grant execute on function public.perfil_id_por_email(text) to service_role;
