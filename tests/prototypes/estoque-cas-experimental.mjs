// PGlite é dependência externa: MIAU_PGLITE_MODULE=file:///.../pglite/dist/index.js node tests/prototypes/estoque-cas-experimental.mjs
const { PGlite } = await import(process.env.MIAU_PGLITE_MODULE || '@electric-sql/pglite');
import { readFile } from 'node:fs/promises'; import assert from 'node:assert/strict';
const db = new PGlite();
await db.exec(`create role anon; create role authenticated; create schema auth;
create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('app.user_id',true),'')::uuid$$;
grant usage on schema auth,public to authenticated; grant execute on function auth.uid() to authenticated;
create table public.perfis(id bigint primary key,user_id uuid not null);
create table public.sync_events(id uuid primary key,perfil_id bigint,tabela text,registro_id text,acao text,dados_criptografados text,timestamp bigint);
insert into public.perfis values(1,'11111111-1111-4111-8111-111111111111'),(2,'22222222-2222-4222-8222-222222222222');
alter table public.perfis enable row level security; create policy perfis_r on public.perfis for select to authenticated using(user_id=auth.uid()); grant select on public.perfis to authenticated;
alter table public.sync_events enable row level security; create policy eventos_r on public.sync_events for select to authenticated using(exists(select 1 from public.perfis p where p.id=perfil_id and p.user_id=auth.uid())); create policy eventos_i on public.sync_events for insert to authenticated with check(exists(select 1 from public.perfis p where p.id=perfil_id and p.user_id=auth.uid())); grant select,insert on public.sync_events to authenticated;
set app.user_id='11111111-1111-4111-8111-111111111111';`);
await db.exec(await readFile(new URL('../../supabase/migrations/20261104220000_estoque_operacao_atomica.sql', import.meta.url),'utf8'));
await db.exec(await readFile(new URL('./estoque-cas-experimental.sql', import.meta.url),'utf8'));
await db.exec('set role authenticated');
let n=0;const ins=async (saldo,acao='update',tid=1,table='materiais',base=null)=>db.query('insert into public.sync_events(id,perfil_id,tabela,registro_id,acao,dados_criptografados,timestamp,revisao_base) values($1,$2,$3,$4,$5,$6,$7,$8)',[`${String(++n).padStart(8,'0')}-0000-4000-8000-000000000000`,tid,table,'1',acao,JSON.stringify({quantidadeEstoque:saldo,nome:'Resina'}),9999999999999,base]);
await ins(10,'insert');
await db.query('insert into public.sync_events(id,perfil_id,tabela,registro_id,acao,dados_criptografados,timestamp) values($1,$2,$3,$4,$5,$6,$7)',['00000001-0000-4000-8000-000000000000',1,'materiais','1','insert',JSON.stringify({quantidadeEstoque:10,nome:'Resina'}),100]);
await assert.rejects(db.query('insert into public.sync_events(id,perfil_id,tabela,registro_id,acao,dados_criptografados,timestamp) values($1,$2,$3,$4,$5,$6,$7)',['00000001-0000-4000-8000-000000000000',1,'materiais','1','insert',JSON.stringify({quantidadeEstoque:11,nome:'Resina'}),100]),/conteúdo diferente/);
await assert.rejects(ins(15),/Revisão divergente/);
await assert.rejects(ins(8,'update',2),/Perfil não autorizado|row-level security/);
const op='11111111-0000-4000-8000-000000000001'; let r=await db.query('select public.movimentar_estoque_atomico(1,$1,$2::jsonb) as valor',[op,JSON.stringify([{materialId:1,diferenca:-2}])]);assert.equal(r.rows[0].valor[0].saldo,8);
await assert.rejects(ins(10),/Revisão divergente/);
await assert.rejects(ins(8),/Revisão divergente/);
const latest = (await db.query("select id from public.sync_events where perfil_id=1 and tabela='materiais' order by timestamp desc,id desc limit 1")).rows[0].id;
await assert.rejects(ins(10,'update',1,'materiais',latest),/Saldo divergente/);
await ins(8,'update',1,'materiais',latest);
await assert.rejects(ins(8,'update',1,'materiais',latest),/Revisão divergente/);
await assert.rejects(ins(8,'delete'),/Exclusão/);
// A compra por RPC é válida, mas um snapshot local que ainda aponta para a
// revisão anterior não pode ser sincronizado por este protótipo. Isso mantém
// o saldo, porém exige integração de revisão no cliente antes de publicação.
const compra='11111111-0000-4000-8000-000000000002';
await db.query('select public.movimentar_estoque_atomico(1,$1,$2::jsonb)',[compra,JSON.stringify([{materialId:1,diferenca:5}])]);
await assert.rejects(ins(13,'update',1,'materiais',latest),/Revisão divergente/);
// Mesmo com revisão atual, restaurar diretamente um saldo anterior é uma
// movimentação e não pode passar como simples atualização de metadados.
const revisaoAtual=(await db.query("select id from public.sync_events where perfil_id=1 and tabela='materiais' and registro_id='1' order by timestamp desc,id desc limit 1")).rows[0].id;
await assert.rejects(ins(10,'update',1,'materiais',revisaoAtual),/Saldo divergente/);
// Um cadastro local que ainda não subiu não pode ser debitado pela RPC.
await assert.rejects(db.query('select public.movimentar_estoque_atomico(1,$1,$2::jsonb)',['11111111-0000-4000-8000-000000000003',JSON.stringify([{materialId:2,diferenca:-1}])]),/Material não encontrado/);
let rows=(await db.query("select timestamp, (dados_criptografados::jsonb->>'quantidadeEstoque')::numeric saldo from public.sync_events where tabela='materiais' order by timestamp")).rows;
assert.equal(rows.length,4); assert.equal(rows[3].saldo,'13');assert.ok(Number(rows[0].timestamp)<Number(rows[1].timestamp)); assert.ok(Number(rows[1].timestamp)<Number(rows[2].timestamp));assert.ok(Number(rows[0].timestamp)<9999999999999);
console.log('OK: CAS, criação, replay, saldo divergente rejeitado, isolamento, baixa, versão antiga rejeitada, metadados, exclusão bloqueada e ordenação do servidor');await db.close();
