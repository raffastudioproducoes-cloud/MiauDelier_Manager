# EPIs na etapa de cura

Em 05/11/2026, a segunda etapa de fabricação passou a permitir a seleção de
materiais do estoque como EPIs, com quantidade e unidade compatível. Os EPIs
usam o mesmo consumo de materiais da peça: entram na validação de estoque,
no custo e na baixa ao salvar. A soma considera materiais repetidos nas duas
etapas. O botão de fabricação foi retirado apenas da segunda etapa.

Os testes da página simulam o salvamento e verificam os dados enviados e a
validação de estoque; não representam teste de baixa no Supabase real.
