alter table public.sync_events add column if not exists revisao_base uuid;

-- PROTÓTIPO: não aplicar em produção. Pressupõe sync_events imutável e RLS de perfil.
create or replace function public.prototipo_guardar_evento() returns trigger
language plpgsql set search_path='' as $$
declare
  anterior public.sync_events%rowtype;
  novo jsonb;
  saldo numeric;
  dono name;
  ultimo bigint;
  repetido public.sync_events%rowtype;
begin
  if auth.uid() is null or not exists (select 1 from public.perfis where id=new.perfil_id and user_id=auth.uid()) then
    raise exception 'Perfil não autorizado';
  end if;
  perform pg_catalog.pg_advisory_xact_lock(new.perfil_id);
  select * into repetido from public.sync_events where id=new.id;
  if found then
    if repetido.perfil_id=new.perfil_id and repetido.tabela=new.tabela and repetido.registro_id=new.registro_id
       and repetido.acao=new.acao and repetido.dados_criptografados=new.dados_criptografados then
      return null;
    end if;
    raise exception 'Identificador de evento já usado com conteúdo diferente';
  end if;
  -- Todos os eventos devem passar pela mesma trava; timestamps fornecidos pelo cliente não são confiáveis.
  select max(timestamp) into ultimo from public.sync_events where perfil_id=new.perfil_id;
  new.timestamp := greatest((extract(epoch from clock_timestamp())*1000)::bigint,coalesce(ultimo,0)+1);
  if new.tabela <> 'materiais' then return new; end if;
  select pg_catalog.pg_get_userbyid(proowner) into dono from pg_catalog.pg_proc
    where oid='public.movimentar_estoque_atomico(bigint,uuid,jsonb)'::regprocedure;
  select * into anterior from public.sync_events where perfil_id=new.perfil_id and tabela='materiais' and registro_id=new.registro_id order by timestamp desc,id desc limit 1;
  if current_user=dono then return new; end if;
  if new.acao='delete' then raise exception 'Exclusão de material requer operação compatível'; end if;
  if new.acao not in ('insert','update') then raise exception 'Ação inválida'; end if;
  begin
    novo := new.dados_criptografados::jsonb;
    saldo := (novo->>'quantidadeEstoque')::numeric;
  exception when others then raise exception 'Dados de material inválidos'; end;
  if saldo is null or saldo < 0 or saldo='NaN'::numeric then raise exception 'Saldo inválido'; end if;
  if anterior.id is null then
    if new.acao <> 'insert' then raise exception 'Material não encontrado; sincronização bloqueada'; end if;
  else
    if anterior.acao='delete' then raise exception 'Material excluído; sincronização bloqueada'; end if;
    if new.acao='insert' then raise exception 'ID de material já existe; sincronização bloqueada'; end if;
    if new.revisao_base is distinct from anterior.id then
      raise exception 'Revisão divergente ou versão antiga: atualize e concilie os dados';
    end if;
    if saldo is distinct from (anterior.dados_criptografados::jsonb->>'quantidadeEstoque')::numeric then
      raise exception 'Saldo divergente: atualize o aplicativo e reconcilie a movimentação';
    end if;
  end if;
  return new;
end $$;
create trigger prototipo_guardar_evento before insert on public.sync_events for each row execute function public.prototipo_guardar_evento();
