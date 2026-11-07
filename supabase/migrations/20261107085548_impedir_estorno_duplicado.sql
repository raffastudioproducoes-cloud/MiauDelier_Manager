-- Impede que uma operação seja recuperada mais de uma vez com IDs diferentes.
-- Operações anteriores à migração são ambíguas e ficam para conciliação.
create table public.estoque_recuperacoes_v1 (
  perfil_id bigint not null references public.perfis(id) on delete cascade,
  operacao_id uuid not null,
  reversao_id uuid,
  legado boolean not null default false,
  primary key (perfil_id, operacao_id)
);
alter table public.estoque_recuperacoes_v1 enable row level security;
revoke all on public.estoque_recuperacoes_v1 from public, anon, authenticated;
insert into public.estoque_recuperacoes_v1(perfil_id, operacao_id, legado)
select perfil_id, operacao_id, true from public.estoque_operacoes;

alter function public.recuperar_movimentacao_estoque(bigint, uuid, uuid, jsonb)
  rename to recuperar_movimentacao_estoque_interna_v1;
revoke all on function public.recuperar_movimentacao_estoque_interna_v1(bigint, uuid, uuid, jsonb)
  from public, anon, authenticated;

create function public.recuperar_movimentacao_estoque(
  p_perfil_id bigint, p_operacao_id uuid, p_reversao_id uuid, p_movimentos jsonb
) returns jsonb language plpgsql security definer set search_path = '' as $$
declare registro public.estoque_recuperacoes_v1%rowtype;
begin
  if auth.uid() is null or not exists (
    select 1 from public.perfis where id=p_perfil_id and user_id=auth.uid()
  ) then raise exception 'Perfil não autorizado'; end if;
  if p_operacao_id is null or p_reversao_id is null or p_operacao_id=p_reversao_id
     or jsonb_typeof(p_movimentos) is distinct from 'array'
     or jsonb_array_length(p_movimentos)=0 then raise exception 'Operação inválida'; end if;
  perform pg_catalog.pg_advisory_xact_lock(p_perfil_id);
  select * into registro from public.estoque_recuperacoes_v1
   where perfil_id=p_perfil_id and operacao_id=p_operacao_id;
  if found then
    if registro.legado then raise exception 'Operação anterior à atualização requer conciliação'; end if;
    if registro.reversao_id is distinct from p_reversao_id then
      raise exception 'Operação já recuperada com outro identificador';
    end if;
  else
    insert into public.estoque_recuperacoes_v1(perfil_id,operacao_id,reversao_id)
      values(p_perfil_id,p_operacao_id,p_reversao_id);
  end if;
  return public.recuperar_movimentacao_estoque_interna_v1(p_perfil_id,p_operacao_id,p_reversao_id,p_movimentos);
end $$;
revoke all on function public.recuperar_movimentacao_estoque(bigint,uuid,uuid,jsonb) from public, anon;
grant execute on function public.recuperar_movimentacao_estoque(bigint,uuid,uuid,jsonb) to authenticated;
