-- Rode só este arquivo se o schema.sql já foi rodado antes.
-- (Mesmo conteúdo da parte "PLANOS" do final de schema.sql.)
-- =====================================================================
-- PLANOS (pacotes) — editáveis pelo painel
-- categoria: nome da aba no site (ex.: Musculação, Pilates)
-- itens: um benefício por linha; **texto** fica em negrito
-- Preço único (preco) e/ou várias opções de pagamento (opcoes)
-- =====================================================================
create table if not exists public.planos (
  id uuid primary key default gen_random_uuid(),
  categoria text not null,
  nome text not null,
  selo_topo text,                   -- etiqueta acima do card (ex.: Mais escolhido)
  destaque boolean not null default false,
  frequencia text,                  -- ex.: 2x por semana
  itens text[] not null default '{}',
  preco_prefixo text,               -- ex.: 12x de
  preco numeric(10,2),              -- ex.: 159.90
  preco_sufixo text,                -- ex.: /mês
  opcoes jsonb not null default '[]', -- [{titulo, detalhe, valor}]
  condicao text,                    -- faixa (ex.: Sem fidelidade)
  condicao_destaque boolean not null default false,
  observacao text,
  pagamento text,
  texto_botao text,
  mensagem_whatsapp text,
  publicado boolean not null default true,
  ordem int not null default 0,
  criado_em timestamptz not null default now()
);

alter table public.planos enable row level security;
drop policy if exists "publico le planos" on public.planos;
create policy "publico le planos" on public.planos for select using (publicado or public.eh_admin());
drop policy if exists "admin altera planos" on public.planos;
create policy "admin altera planos" on public.planos for all
  using (public.eh_admin()) with check (public.eh_admin());

insert into public.planos (categoria, nome, selo_topo, destaque, frequencia, itens, preco_prefixo, preco, preco_sufixo, opcoes, condicao, condicao_destaque, observacao, pagamento, texto_botao, mensagem_whatsapp, ordem)
select * from (values
  ('Musculação', 'Bronze', null, false, null,
    array['Sala de musculação **5 dias** por semana', 'Zumba, Fit Dance, Jump, Power Glúteo, GAP e Pilates Solo', 'Acesso livre à área de cardio'],
    null, 159.90, '/mês', '[]'::jsonb, 'Sem fidelidade', false,
    'Taxa de adesão para novas matrículas: **R$ 29,90**', 'Pix · Cartão de débito · Cartão de crédito',
    'Quero o Bronze', 'Olá! Tenho interesse no Plano Bronze (Musculação).', 1),
  ('Musculação', 'Prata', null, false, null,
    array['Sala de musculação **7 dias** por semana', 'Zumba, Fit Dance, Jump, Power Glúteo, GAP e Pilates Solo', 'Acesso livre à área de cardio'],
    null, 139.90, '/mês', '[]'::jsonb, 'Fidelidade de 12 meses · recorrente', true,
    '**Sem taxa de adesão**', 'Cartão de crédito · Débito em conta',
    'Quero o Prata', 'Olá! Tenho interesse no Plano Prata (Musculação).', 2),
  ('Musculação', 'Ouro', 'Mais escolhido', true, null,
    array['Sala de musculação **7 dias** por semana', 'Zumba, Fit Dance, Jump, Power Glúteo, GAP e Pilates Solo', 'Acesso livre à área de cardio'],
    '12x de', 109.90, null, '[]'::jsonb, 'Plano anual · sem recorrência', true,
    'Valor total: **R$ 1.318,80** · **sem taxa de adesão**', 'Pix · Cartão de débito · Cartão de crédito',
    'Quero o Ouro', 'Olá! Tenho interesse no Plano Ouro (Musculação).', 3),
  ('Pilates', 'Platina', null, false, '1x por semana',
    array['Pilates 1x por semana', 'Grupos reduzidos', 'Acompanhamento de profissionais qualificados'],
    null, null, '/mês',
    '[{"titulo":"Plano anual","detalhe":"12x no cartão de crédito · total R$ 2.158,80","valor":"R$ 179,90"},{"titulo":"Fidelidade de 12 meses","detalhe":"Recorrência no crédito ou débito em conta","valor":"R$ 199,90"},{"titulo":"Sem fidelidade","detalhe":"+ taxa de adesão R$ 29,90","valor":"R$ 239,90"}]'::jsonb,
    null, false, null, null,
    'Quero o Platina', 'Olá! Tenho interesse no Plano Platina (Pilates 1x por semana).', 4),
  ('Pilates', 'Diamante', 'Mais completo', true, '2x por semana',
    array['Pilates 2x por semana', '**Musculação 3x por semana (cortesia)**', 'Grupos reduzidos', 'Acompanhamento de profissionais qualificados'],
    null, null, '/mês',
    '[{"titulo":"Plano anual","detalhe":"12x no cartão de crédito · total R$ 2.758,80","valor":"R$ 229,90"},{"titulo":"Fidelidade de 12 meses","detalhe":"Recorrência no crédito ou débito em conta","valor":"R$ 249,90"},{"titulo":"Sem fidelidade","detalhe":"+ taxa de adesão R$ 29,90","valor":"R$ 279,90"}]'::jsonb,
    null, false, null, null,
    'Quero o Diamante', 'Olá! Tenho interesse no Plano Diamante (Pilates 2x por semana).', 5)
) v(categoria, nome, selo_topo, destaque, frequencia, itens, preco_prefixo, preco, preco_sufixo, opcoes, condicao, condicao_destaque, observacao, pagamento, texto_botao, mensagem_whatsapp, ordem)
where not exists (select 1 from public.planos);
