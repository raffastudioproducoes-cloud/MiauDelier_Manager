# Edição e venda de pedidos — 05/11/2026

## Plano e decisões

- [x] Permitir alterar somente as peças de um pedido, preservando o cliente.
- [x] Escolher a carteira no momento da venda e registrar uma entrada pelo total do pedido.
- [x] Atualizar as peças para vendidas e integrar a entrada às métricas financeiras existentes.
- [x] Preservar o valor da venda e bloquear repetição, alteração de peças ou exclusão após o registro.
- [x] Testar repositório e interface, incluindo valor divergente e carteira inválida.

## Funcionamento

A edição aceita peças disponíveis e não vinculadas a outro pedido. A venda confirma a carteira e o valor exibido; o lançamento financeiro, a alteração das peças e a identificação da venda são gravados em uma transação local. O valor registrado fica preservado caso o preço de uma peça mude depois. A conclusão da venda não altera automaticamente o estado de entrega do pedido.

O saldo da carteira e as métricas existentes utilizam a entrada registrada. Não há estorno nesta alteração; pedidos com venda registrada não podem ser cancelados ou excluídos por esse fluxo.

## Verificação e limites

Testes direcionados de pedidos, peças e interface: 39 aprovados. TypeScript e lint dos arquivos alterados aprovados. O banco de testes é local; a proteção contra venda duplicada é transacional no dispositivo e a sincronização entre dispositivos não fornece garantia de atomicidade global. Nenhuma venda real foi realizada como teste.

A auditoria de dependências de produção identificou três vulnerabilidades existentes (duas altas e uma crítica); atualização de dependências não faz parte desta alteração.
