-- Infraestrutura aditiva; não altera o comportamento dos perfis existentes.
create table if not exists public.estoque_operacoes (
  perfil_id bigint not null references public.perfis(id) on delete cascade,
  operacao_id uuid not null,
  requisicao jsonb not null,
  resultado jsonb not null,
  primary key (perfil_id, operacao_id)
);

alter table public.estoque_operacoes enable row level security;
revoke all on public.estoque_operacoes from anon, authenticated;

create or replace function public.movimentar_estoque_atomico(
  p_perfil_id bigint, p_operacao_id uuid, p_movimentos jsonb
) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  item jsonb;
  anterior public.sync_events%rowtype;
  dados jsonb;
  saldo numeric;
  diferenca numeric;
  resultado jsonb := '[]'::jsonb;
  executada public.estoque_operacoes%rowtype;
  instante bigint;
begin
  if auth.uid() is null or not exists (
    select 1 from public.perfis where id = p_perfil_id and user_id = auth.uid()
  ) then
    raise exception 'Perfil não autorizado';
  end if;
  if p_operacao_id is null or jsonb_typeof(p_movimentos) <> 'array'
     or jsonb_array_length(p_movimentos) = 0 then
    raise exception 'Movimentação inválida';
  end if;
  -- A trava serializa movimentos do mesmo perfil, inclusive materiais novos.
  perform pg_catalog.pg_advisory_xact_lock(p_perfil_id);
  select * into executada from public.estoque_operacoes
    where perfil_id = p_perfil_id and operacao_id = p_operacao_id;
  if found then
    if executada.requisicao <> p_movimentos then
      raise exception 'Identificador de operação já utilizado';
    end if;
    return executada.resultado;
  end if;
  if (select count(*) <> count(distinct x->>'materialId')
      from jsonb_array_elements(p_movimentos) x) then
    raise exception 'Material repetido na movimentação';
  end if;
  for item in select value from jsonb_array_elements(p_movimentos) order by value->>'materialId' loop
    if coalesce(item->>'materialId', '') !~ '^[1-9][0-9]*$'
       or coalesce(item->>'diferenca', '') !~ '^-?[0-9]+([.][0-9]+)?$' then
      raise exception 'Movimentação inválida';
    end if;
    diferenca := (item->>'diferenca')::numeric;
    select * into anterior from public.sync_events
      where perfil_id = p_perfil_id and tabela = 'materiais'
        and registro_id = item->>'materialId'
      order by timestamp desc, id desc limit 1;
    if not found or anterior.acao = 'delete' then
      raise exception 'Material não encontrado no servidor';
    end if;
    dados := anterior.dados_criptografados::jsonb;
    saldo := (dados->>'quantidadeEstoque')::numeric;
    if saldo is null or saldo < 0 or saldo + diferenca < 0 then
      raise exception 'Estoque insuficiente para material %: disponível %, solicitado %',
        item->>'materialId', saldo, greatest(-diferenca, 0);
    end if;
    dados := jsonb_set(dados, '{quantidadeEstoque}', to_jsonb(saldo + diferenca));
    instante := greatest((extract(epoch from clock_timestamp()) * 1000)::bigint, anterior.timestamp + 1);
    insert into public.sync_events (id, perfil_id, tabela, registro_id, acao, dados_criptografados, timestamp)
      values (gen_random_uuid(), p_perfil_id, 'materiais', item->>'materialId', 'update', dados::text, instante);
    resultado := resultado || jsonb_build_array(jsonb_build_object('materialId', item->>'materialId', 'saldo', saldo + diferenca));
  end loop;
  insert into public.estoque_operacoes (perfil_id, operacao_id, requisicao, resultado)
    values (p_perfil_id, p_operacao_id, p_movimentos, resultado);
  return resultado;
end;
$$;
revoke all on function public.movimentar_estoque_atomico(bigint, uuid, jsonb) from public, anon;
grant execute on function public.movimentar_estoque_atomico(bigint, uuid, jsonb) to authenticated;
