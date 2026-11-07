# Fabricação de peças e vida útil — concluído

Fechamento em 07/11/2026. A entrega está publicada na `main`; a proteção final de saldo está no commit `64a8260` e na migração Supabase `20261107091546_proteger_saldo_sync_eventos`.

## Formas, consumos e identidade

- Uma peça possui forma principal e formas adicionais, cada uma com quantidade própria. O volume sugerido de resina e a amortização das formas são somados.
- Quando a forma principal já possui pés incluídos, o formulário alerta para evitar duplicidade.
- Volume sugerido é previsão: apenas os materiais realmente informados nos consumos baixam do estoque.
- A lista exibe **Editar** e **Excluir**. Na edição, o estoque é ajustado pela diferença dos consumos.
- Peças novas recebem UUID, série derivada e ID local aleatório. Conflito de identidade detectado interrompe a sincronização para preservar dados.

## Vida útil e custos

- **Confirmar uso real** grava o desgaste de formas, equipamentos e ferramentas reutilizáveis individualizadas; não há estorno de desgaste ao cancelar ou excluir a peça.
- A amortização do molde usa usos registrados. Equipamentos usam tempo e vida útil em horas; ferramentas usam vida útil em usos. Energia permanece calculada separadamente.
- Histórico anterior sem registro de uso não é inventado; o saldo de vida útil exibido é estimativa máxima baseada no histórico confirmado.

## Estoque e sincronização

- Toda baixa, devolução e reposição passa pela RPC atômica de estoque, serializada por perfil e idempotente por operação.
- Cancelamento ou exclusão devolve somente o consumo registrado; venda registrada impede exclusão sem tratamento da venda.
- A recuperação de resposta perdida é idempotente. Um estorno não pode ser repetido com outro identificador.
- A migração `20261107091546` impede que snapshots de dispositivos antigos sobrescrevam `quantidadeEstoque`: depois do saldo inicial, somente a RPC atômica pode alterar o saldo no servidor.
- Cliente PWA antigo/offline não pode ser apagado remotamente. Se tentar enviar saldo divergente, o banco bloqueia a alteração e mantém a fila para conciliação.

## Verificações realizadas

A proteção foi verificada em PostgreSQL isolado com cenários de baixa, repetição, recuperação, estorno duplicado e tentativa de sobrescrita concorrente. Build de produção aprovado antes da publicação. Nenhum estoque, conta ou registro real foi alterado pelos testes.
