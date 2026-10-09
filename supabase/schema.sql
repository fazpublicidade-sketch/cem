-- =====================================================================
-- Corpo & Mente Wellness Club — banco de dados do site
-- Rode este arquivo inteiro uma vez no Supabase: SQL Editor → New query
-- → colar → Run. Pode rodar de novo sem problema (não duplica nada).
-- =====================================================================

-- ---------- Quem pode entrar no painel ----------
create table if not exists public.admins (
  email text primary key
);

create or replace function public.eh_admin()
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.admins
    where lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );
$$;

-- ---------- Horário de funcionamento ----------
-- local: 'academia' ou 'pilates'
create table if not exists public.funcionamento (
  id uuid primary key default gen_random_uuid(),
  local text not null check (local in ('academia', 'pilates')),
  dias text not null,
  horario text not null,
  ordem int not null default 0
);

-- ---------- Grades de aulas ----------
-- grade: 'coletivas' (Zumba, Jump, lutas...) ou 'box' (Hyrox, CrossMazzei)
-- dia: 1 = segunda ... 6 = sábado, 7 = domingo
create table if not exists public.grade_aulas (
  id uuid primary key default gen_random_uuid(),
  grade text not null check (grade in ('coletivas', 'box')),
  dia smallint not null check (dia between 1 and 7),
  hora time not null,
  atividade text not null,
  observacao text,
  destaque boolean not null default false,
  ativo boolean not null default true,
  criado_em timestamptz not null default now()
);
create index if not exists grade_aulas_ordem on public.grade_aulas (grade, dia, hora);

-- ---------- Eventos e promoções ----------
create table if not exists public.publicacoes (
  id uuid primary key default gen_random_uuid(),
  tipo text not null check (tipo in ('evento', 'promocao')),
  titulo text not null,
  descricao text,
  imagem_url text,
  data_evento timestamptz,          -- quando acontece (eventos)
  local text,                       -- onde acontece (eventos)
  valido_ate date,                  -- some do site depois desse dia
  texto_botao text,
  link_botao text,                  -- link externo (opcional)
  mensagem_whatsapp text,           -- se preenchido, o botão abre o WhatsApp
  destaque boolean not null default false,
  publicado boolean not null default true,
  ordem int not null default 0,
  criado_em timestamptz not null default now()
);

-- ---------- Parceiros ----------
create table if not exists public.parceiros (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  logo_url text,
  foto_url text,
  descricao text,
  beneficio text,                   -- ex.: "10% de desconto para alunos"
  link text,                        -- site ou Instagram
  texto_botao text,
  publicado boolean not null default true,
  ordem int not null default 0,
  criado_em timestamptz not null default now()
);

-- ---------- Segurança: visitante só lê, só admin altera ----------
alter table public.parceiros     enable row level security;
drop policy if exists "publico le parceiros" on public.parceiros;
create policy "publico le parceiros" on public.parceiros for select using (publicado or public.eh_admin());
drop policy if exists "admin altera parceiros" on public.parceiros;
create policy "admin altera parceiros" on public.parceiros for all
  using (public.eh_admin()) with check (public.eh_admin());

alter table public.admins        enable row level security;
alter table public.funcionamento enable row level security;
alter table public.grade_aulas   enable row level security;
alter table public.publicacoes   enable row level security;

drop policy if exists "admin ve admins" on public.admins;
create policy "admin ve admins" on public.admins for select using (public.eh_admin());

drop policy if exists "publico le funcionamento" on public.funcionamento;
create policy "publico le funcionamento" on public.funcionamento for select using (true);
drop policy if exists "admin altera funcionamento" on public.funcionamento;
create policy "admin altera funcionamento" on public.funcionamento for all
  using (public.eh_admin()) with check (public.eh_admin());

drop policy if exists "publico le grade" on public.grade_aulas;
create policy "publico le grade" on public.grade_aulas for select using (ativo or public.eh_admin());
drop policy if exists "admin altera grade" on public.grade_aulas;
create policy "admin altera grade" on public.grade_aulas for all
  using (public.eh_admin()) with check (public.eh_admin());

drop policy if exists "publico le publicacoes" on public.publicacoes;
create policy "publico le publicacoes" on public.publicacoes for select using (
  public.eh_admin()
  or (publicado and (valido_ate is null or valido_ate >= (now() at time zone 'America/Sao_Paulo')::date))
);
drop policy if exists "admin altera publicacoes" on public.publicacoes;
create policy "admin altera publicacoes" on public.publicacoes for all
  using (public.eh_admin()) with check (public.eh_admin());

-- ---------- Imagens dos eventos/promoções ----------
insert into storage.buckets (id, name, public)
values ('midia', 'midia', true)
on conflict (id) do nothing;

drop policy if exists "publico ve midia" on storage.objects;
create policy "publico ve midia" on storage.objects for select using (bucket_id = 'midia');
drop policy if exists "admin envia midia" on storage.objects;
create policy "admin envia midia" on storage.objects for insert with check (bucket_id = 'midia' and public.eh_admin());
drop policy if exists "admin altera midia" on storage.objects;
create policy "admin altera midia" on storage.objects for update using (bucket_id = 'midia' and public.eh_admin());
drop policy if exists "admin apaga midia" on storage.objects;
create policy "admin apaga midia" on storage.objects for delete using (bucket_id = 'midia' and public.eh_admin());

-- ---------- Dados iniciais (das artes atuais) — só entram se a tabela estiver vazia ----------
insert into public.funcionamento (local, dias, horario, ordem)
select * from (values
  ('academia', 'Segunda a sexta', '05h às 22h', 1),
  ('academia', 'Sábado, domingo e feriados', '08h às 12h', 2),
  ('pilates',  'Segunda a sexta', '07h às 11h e 15h às 21h', 3)
) v(local, dias, horario, ordem)
where not exists (select 1 from public.funcionamento);

insert into public.grade_aulas (grade, dia, hora, atividade, observacao, destaque)
select * from (values
  -- Aulas coletivas
  ('coletivas', 1, '07:00'::time, 'Jump', null, false),
  ('coletivas', 1, '08:00', 'Zumba', null, false),
  ('coletivas', 1, '21:00', 'Muay Thai', null, false),
  ('coletivas', 2, '08:15', 'GAP', null, false),
  ('coletivas', 2, '21:00', 'Jiu-Jitsu', null, false),
  ('coletivas', 3, '08:15', 'Jump', null, false),
  ('coletivas', 3, '19:00', 'Jump', null, false),
  ('coletivas', 3, '21:00', 'Muay Thai', null, false),
  ('coletivas', 4, '08:15', 'Pilates Solo', null, false),
  ('coletivas', 4, '17:00', 'Power Glúteo', null, false),
  ('coletivas', 4, '21:00', 'Jiu-Jitsu', null, false),
  ('coletivas', 5, '08:15', 'Funcional', null, false),
  ('coletivas', 5, '20:00', 'Fit Dance', null, false),
  ('coletivas', 6, '09:00', 'Jump', null, false),
  ('coletivas', 6, '11:00', 'Fit Dance', null, false),
  -- Box Mazzei
  ('box', 1, '06:00', 'CrossMazzei', null, false),
  ('box', 1, '12:00', 'CrossMazzei', null, false),
  ('box', 1, '17:00', 'Hyrox', null, true),
  ('box', 1, '18:00', 'CrossMazzei', null, false),
  ('box', 1, '19:00', 'CrossMazzei', null, false),
  ('box', 1, '20:00', 'CrossMazzei', null, false),
  ('box', 2, '06:00', 'CrossMazzei', null, false),
  ('box', 2, '07:00', 'Hyrox', null, true),
  ('box', 2, '12:00', 'Hyrox', null, true),
  ('box', 2, '12:00', 'CrossMazzei', null, false),
  ('box', 2, '18:00', 'CrossMazzei', null, false),
  ('box', 2, '19:00', 'Hyrox', null, true),
  ('box', 2, '20:00', 'CrossMazzei', null, false),
  ('box', 3, '06:00', 'CrossMazzei', null, false),
  ('box', 3, '07:00', 'Hyrox', null, true),
  ('box', 3, '12:00', 'CrossMazzei', null, false),
  ('box', 3, '17:00', 'CrossMazzei', null, false),
  ('box', 3, '18:00', 'CrossMazzei', null, false),
  ('box', 3, '20:00', 'Hyrox', null, true),
  ('box', 4, '06:00', 'CrossMazzei', null, false),
  ('box', 4, '07:00', 'Hyrox', null, true),
  ('box', 4, '12:00', 'Hyrox', null, true),
  ('box', 4, '12:00', 'CrossMazzei', null, false),
  ('box', 4, '18:00', 'CrossMazzei', null, false),
  ('box', 4, '19:00', 'Hyrox', null, true),
  ('box', 4, '20:00', 'CrossMazzei', null, false),
  ('box', 5, '06:00', 'CrossMazzei', null, false),
  ('box', 5, '07:00', 'Hyrox', null, true),
  ('box', 5, '12:00', 'CrossMazzei', null, false),
  ('box', 5, '18:00', 'CrossMazzei', null, false),
  ('box', 5, '19:00', 'CrossMazzei', null, false),
  ('box', 6, '07:30', 'Hyrox', 'Domingos alternados', true),
  ('box', 6, '10:00', 'CrossMazzei', null, false)
) v(grade, dia, hora, atividade, observacao, destaque)
where not exists (select 1 from public.grade_aulas);

-- ---------- Quem acessa o painel ----------
insert into public.admins (email) values ('corpoemente24horas@gmail.com'), ('faz.publicidade@gmail.com')
on conflict (email) do nothing;
