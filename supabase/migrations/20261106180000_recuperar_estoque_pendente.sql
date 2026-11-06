-- Adiciona recuperação idempotente de uma operação cujo resultado local é incerto.
-- Aplicar somente após validação isolada e planejamento da implantação de todos os clientes.
create or replace function public.recuperar_movimentacao_estoque(
  p_perfil_id bigint, p_operacao_id uuid, p_reversao_id uuid, p_movimentos jsonb
) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  original public.estoque_operacoes%rowtype;
  reverso jsonb;
  saldos jsonb;
begin
  if auth.uid() is null or not exists (
    select 1 from public.perfis where id = p_perfil_id and user_id = auth.uid()
  ) then raise exception 'Perfil não autorizado'; end if;
  if p_operacao_id is null or p_reversao_id is null or p_operacao_id = p_reversao_id
     or jsonb_typeof(p_movimentos) <> 'array' or jsonb_array_length(p_movimentos) = 0 then
    raise exception 'Operação inválida';
  end if;
  perform pg_catalog.pg_advisory_xact_lock(p_perfil_id);
  select * into original from public.estoque_operacoes
    where perfil_id = p_perfil_id and operacao_id = p_operacao_id;
  if not found then
    -- Tombstone: se a requisição original atrasada chegar depois, o mesmo UUID
    -- encontra este registro e não realiza a baixa. Os dados não são alterados.
    insert into public.estoque_operacoes(perfil_id, operacao_id, requisicao, resultado)
      values (p_perfil_id, p_operacao_id, p_movimentos, 'null'::jsonb);
    return jsonb_build_object('estado', 'nao_encontrada', 'saldos', '[]'::jsonb);
  end if;
  if original.requisicao <> p_movimentos then raise exception 'Operação não corresponde à requisição original'; end if;
  if original.resultado = 'null'::jsonb then
    return jsonb_build_object('estado', 'nao_encontrada', 'saldos', '[]'::jsonb);
  end if;
  select jsonb_agg(jsonb_build_object('materialId', item->>'materialId',
                                      'diferenca', -(item->>'diferenca')::numeric) order by ord)
    into reverso from jsonb_array_elements(p_movimentos) with ordinality as t(item, ord);
  -- A função existente valida saldo, autenticação e idempotência da reversão.
  perform public.movimentar_estoque_atomico(p_perfil_id, p_reversao_id, reverso);
  -- Uma repetição da reversão pode devolver um resultado histórico. Ler os
  -- saldos mais recentes sob a trava, inclusive após outros movimentos.
  select jsonb_agg(jsonb_build_object('materialId', item->>'materialId',
                                     'saldo', (ultimo.dados_criptografados::jsonb->>'quantidadeEstoque')::numeric) order by ord)
    into saldos
    from jsonb_array_elements(p_movimentos) with ordinality as t(item, ord)
    cross join lateral (
      select e.dados_criptografados, e.acao from public.sync_events e
       where e.perfil_id = p_perfil_id and e.tabela = 'materiais' and e.registro_id = item->>'materialId'
       order by e.timestamp desc, e.id desc limit 1
    ) ultimo
   where ultimo.acao <> 'delete';
  if jsonb_array_length(coalesce(saldos, '[]'::jsonb)) <> jsonb_array_length(p_movimentos) then
    raise exception 'Material não encontrado na reconciliação';
  end if;
  return jsonb_build_object('estado', 'estornada', 'saldos', saldos);
end;
$$;
revoke all on function public.recuperar_movimentacao_estoque(bigint, uuid, uuid, jsonb) from public, anon;
grant execute on function public.recuperar_movimentacao_estoque(bigint, uuid, uuid, jsonb) to authenticated;
