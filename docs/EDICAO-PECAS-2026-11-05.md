# Edição de peças e consumos

O link de detalhes abre a edição da peça, permitindo alterar dados de produção,
forma, equipamentos, materiais, EPIs e custos. O estoque recebe apenas a
diferença dos consumos; peças canceladas não movimentam estoque ao editar.
O preço é recalculado com o custo do molde e os demais dados da peça.

Novos consumos registram o custo unitário no momento do uso. Ao editar, a
quantidade já registrada conserva esse custo; o acréscimo usa o custo atual.
Consumos antigos que não possuem custo registrado usam o custo atual como
alternativa. Consumos históricos não identificam a etapa original e são
apresentados juntos na edição.

As verificações automatizadas usam servidor simulado; as limitações existentes
da sincronização e da recuperação de resposta perdida permanecem documentadas
em `PLANO-ESTOQUE-CONSISTENCIA.md`.
