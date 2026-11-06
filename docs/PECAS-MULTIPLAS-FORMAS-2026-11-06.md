# Peças com múltiplas formas — trabalho em andamento

## Objetivo e estado

Alteração em desenvolvimento para selecionar outras formas na fabricação e edição de peças, somar volumes e amortização, registrar consumos e melhorar a identificação. O estado desta documentação não representa publicação em produção.

## Regras e limites

- A forma principal vale um uso; cada forma adicional informa quantas vezes é utilizada. A sugestão soma o volume de cada forma multiplicado pela quantidade. Uma forma principal pode já conter pés; a tela alerta sobre soma duplicada.
- O volume real informado não cria consumos automaticamente. Resina, endurecedor, EPIs e demais insumos usados precisam ser registrados nas linhas de material. Não presumir que um valor em ml foi debitado do estoque.
- O consumo registrado é debitado ao criar a peça; alterações movimentam a diferença; cancelamento e exclusão estornam os materiais registrados, evitando estorno repetido. Estas regras dependem do funcionamento do estoque e não representam garantia de consistência global.
- Contadores de usos de moldes seguem vínculos de peças, com estorno ao cancelar/excluir. Não constituem histórico de desgaste físico irreversível.
- O custo estimado de desgaste de equipamento usa custo de aquisição dividido pela vida útil estimada em horas, multiplicado pelo tempo de uso, além da energia. Não há controle durável de horas acumuladas ou vida útil restante. A ausência de valor ou vida útil impede calcular seu desgaste de forma confiável.
- Novas peças recebem UUID e número de série derivado dele, sem alterar os registros antigos. A chave numérica legada de sincronização continua sujeita a colisões entre dispositivos; o UUID adicional não corrige esse risco nem identifica retroativamente peças antigas.
- A confirmação remota repete uma vez, com o mesmo identificador, após erro de comunicação. Se o resultado permanecer incerto, não existe recuperação durável da operação; outra tentativa pode duplicar o movimento e snapshots legados ainda podem sobrescrever saldos. Ver `PLANO-ESTOQUE-CONSISTENCIA.md`.
- Peças de pedido com venda registrada mantêm a proteção existente contra exclusão. Não houve teste com dados reais nem alteração do banco produtivo.

## Pendências para cumprir integralmente a solicitação

Definir e implementar registros duráveis de utilização efetiva de equipamentos e itens reutilizáveis, distinguindo estimativa de uso real e evitando perder histórico ao cancelar ou excluir uma peça. Conciliar a identidade e o estoque entre dispositivos e recuperar transações com confirmação incerta. Validar o fluxo completo em ambiente isolado antes de qualquer publicação.
