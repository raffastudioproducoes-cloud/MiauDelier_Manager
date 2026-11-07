# Status de entrega — peças, formas, vida útil e estoque

Data de fechamento: 07/11/2026. Banco de produção: migração `20261107091546`. Código de produção: versão `1.9.0` na `main`.

| Entrega solicitada | Estado | Resultado |
| --- | --- | --- |
| Formas adicionais | Concluída | Forma principal e formas adicionais com quantidade. |
| Resina e amortização | Concluída | Volume sugerido e amortização das formas são somados. |
| Edição da peça | Concluída | Botão **Editar** substitui detalhes; ajuste de consumos por diferença. |
| Estoque na produção | Concluída | Materiais usados baixam no servidor; resina prevista não é baixada sem consumo real informado. |
| Cancelamento/exclusão | Concluída | Consumo registrado é devolvido uma vez; venda impede exclusão sem tratar o registro financeiro. |
| Identificador único | Concluída | Novas peças têm UUID e série derivada; conflitos identificáveis interrompem a sincronização. |
| Vida útil de molde | Concluída | Uso real e amortização por uso registrados. |
| Vida útil de equipamento | Concluída | Horas reais e amortização registrados. |
| Vida útil de ferramenta | Concluída | Ferramenta individualizada registra uso sem baixa da unidade reutilizável. |
| Concorrência entre dispositivos | Concluída | Operações atômicas, idempotência, recuperação e bloqueio de snapshots antigos no banco. |
| Banco e site | Concluída | Migrações aplicadas no Supabase e aplicação publicada na `main`. |

## Limites operacionais conhecidos

- PWA antigo/offline não pode ser removido remotamente. Se enviar um saldo divergente, o servidor o rejeita e preserva a fila para conciliação.
- Registros históricos sem UUID não são renumerados; a garantia de identidade integral vale para peças novas.
- Uso de ferramenta exige cadastro unitário; estoque em lote não identifica qual unidade sofreu desgaste.

## Encerramento

Esta entrega foi formalmente encerrada em 07/11/2026, na versão `1.9.0`. Não há tarefa aberta neste escopo. Qualquer demanda futura deve abrir uma nova tarefa e começar pela leitura deste documento, de `PECAS-MULTIPLAS-FORMAS-2026-11-06.md` e do registro de encerramento no Vault.
