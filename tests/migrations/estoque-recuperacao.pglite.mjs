// Execute com PGlite instalado fora do projeto: MIAU_PGLITE_MODULE=file:///caminho/para/pglite/dist/index.js node tests/migrations/estoque-recuperacao.pglite.mjs
const { PGlite } = await import(process.env.MIAU_PGLITE_MODULE || '@electric-sql/pglite')
import { readFile } from 'node:fs/promises'
import assert from 'node:assert/strict'
const db = new PGlite()
const root = new URL('../../supabase/migrations/', import.meta.url)
await db.exec(`create role anon; create role authenticated; create schema auth;
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('app.user_id',true),'')::uuid $$;
create table public.perfis(id bigint primary key, user_id uuid not null);
create table public.sync_events(id uuid primary key, perfil_id bigint, tabela text, registro_id text, acao text, dados_criptografados text, timestamp bigint);
insert into public.perfis values (1,'11111111-1111-4111-8111-111111111111'), (2,'22222222-2222-4222-8222-222222222222');
set app.user_id = '11111111-1111-4111-8111-111111111111';
insert into public.sync_events values ('00000000-0000-4000-8000-000000000001',1,'materiais','1','insert','{"quantidadeEstoque":10}',1);`)
await db.exec(await readFile(new URL('20261104220000_estoque_operacao_atomica.sql', root), 'utf8'))
await db.exec(await readFile(new URL('20261107034548_recuperar_estoque_pendente.sql', root), 'utf8'))
const q = async (query,params=[]) => (await db.query(query, params)).rows[0].v
const op='11111111-0000-4000-8000-000000000001', rev='11111111-0000-4000-8000-000000000002', absent='11111111-0000-4000-8000-000000000003', rev2='11111111-0000-4000-8000-000000000004'
const m=JSON.stringify([{materialId:1,diferenca:-2}]);
assert.equal((await q('select public.movimentar_estoque_atomico(1,$1,$2::jsonb) v',[op,m]))[0].saldo,8)
assert.equal((await q('select public.movimentar_estoque_atomico(1,$1,$2::jsonb) v',[op,m]))[0].saldo,8)
let r=await q('select public.recuperar_movimentacao_estoque(1,$1,$2,$3::jsonb) v',[op,rev,m]); assert.equal(r.estado,'estornada'); assert.equal(r.saldos[0].saldo,10)
r=await q('select public.recuperar_movimentacao_estoque(1,$1,$2,$3::jsonb) v',[op,rev,m]); assert.equal(r.saldos[0].saldo,10)
r=await q('select public.recuperar_movimentacao_estoque(1,$1,$2,$3::jsonb) v',[absent,rev2,m]); assert.equal(r.estado,'nao_encontrada')
assert.equal(await q('select public.movimentar_estoque_atomico(1,$1,$2::jsonb) v',[absent,m]),null)
await assert.rejects(q('select public.recuperar_movimentacao_estoque(2,$1,$2,$3::jsonb) v',[op,rev,m]), /não autorizado/i)
await assert.rejects(q('select public.recuperar_movimentacao_estoque(1,$1,$2,$3::jsonb) v',[op,rev,JSON.stringify([{materialId:1,diferenca:-3}])]), /não corresponde/i)
await q('select public.movimentar_estoque_atomico(1,$1,$2::jsonb) v',['11111111-0000-4000-8000-000000000005',JSON.stringify([{materialId:1,diferenca:-1}])])
r=await q('select public.recuperar_movimentacao_estoque(1,$1,$2,$3::jsonb) v',[op,rev,m]); assert.equal(r.saldos[0].saldo,9)
assert.equal((await q("select dados_criptografados::jsonb v from sync_events where perfil_id=1 and tabela='materiais' order by timestamp desc, id desc limit 1")).quantidadeEstoque,9)
// Uma entrada cuja confirmação foi perdida não pode ser revertida criando
// estoque negativo se outro dispositivo já consumiu parte do saldo.
const entrada='11111111-0000-4000-8000-000000000006', revEntrada='11111111-0000-4000-8000-000000000007'
const entradaMov=JSON.stringify([{materialId:1,diferenca:10}])
await q('select public.movimentar_estoque_atomico(1,$1,$2::jsonb) v',[entrada,entradaMov])
await q('select public.movimentar_estoque_atomico(1,$1,$2::jsonb) v',['11111111-0000-4000-8000-000000000008',JSON.stringify([{materialId:1,diferenca:-18}])])
await assert.rejects(q('select public.recuperar_movimentacao_estoque(1,$1,$2,$3::jsonb) v',[entrada,revEntrada,entradaMov]), /estoque insuficiente/i)
assert.equal((await q("select dados_criptografados::jsonb v from sync_events where perfil_id=1 and tabela='materiais' order by timestamp desc, id desc limit 1")).quantidadeEstoque,1)
// Quando um lote inclui material ainda não sincronizado, a exceção reverte
// também os movimentos anteriores do mesmo lote; não há baixa parcial remota.
const incompleto='11111111-0000-4000-8000-000000000009'
await assert.rejects(q('select public.movimentar_estoque_atomico(1,$1,$2::jsonb) v',[incompleto,JSON.stringify([{materialId:1,diferenca:-1},{materialId:2,diferenca:-1}])]),/Material não encontrado/i)
assert.equal((await q("select dados_criptografados::jsonb v from sync_events where perfil_id=1 and tabela='materiais' and registro_id='1' order by timestamp desc, id desc limit 1")).quantidadeEstoque,1)
assert.equal(Number((await db.query('select count(*) as total from estoque_operacoes where perfil_id=1 and operacao_id=$1',[incompleto])).rows[0].total),0)
console.log('OK: execução, repetição, compensação, repetição da compensação, tombstone, requisição atrasada, isolamento de perfil, requisição divergente e saldo final')
await db.close()
