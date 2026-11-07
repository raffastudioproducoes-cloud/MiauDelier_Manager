# Fabricação de peças e vida útil — trabalho em andamento

Estado em 06/11/2026: implementação em branch de trabalho; não publicada nem conectada a banco produtivo atualizado. Este documento descreve o código em análise, não uma garantia de funcionamento no ambiente real.

## Formas, consumos e identificação

- A forma principal vale um uso; as adicionais informam a quantidade. A sugestão soma os volumes e o custo de amortização das formas. Um aviso aparece quando a forma principal já possui pés incluídos no cálculo.
- O volume real não baixa resina automaticamente: resina, endurecedor e outros materiais efetivamente utilizados devem ser preenchidos nas linhas de consumo. A criação debita essas linhas, a edição ajusta a diferença e cancelamento ou exclusão devolvem os registros efetivamente baixados, preservando as proteções de pedidos com venda registrada.
- A listagem apresenta Editar e Excluir. O formulário de edição permanece acessível com as demais funções de detalhes.
- Peças novas recebem UUID e número de série derivado dele, e seu ID numérico é aleatório no intervalo seguro para reduzir colisões. A sincronização interrompe o lote ao detectar identidades de peças incompatíveis, sem avançar o cursor. Isso não garante unicidade global: clientes antigos, registros históricos sem UUID e IDs numéricos de outras tabelas continuam expostos a conflitos. Dados antigos não são renumerados.

## Vida útil

- O cadastro de produção representa previsão. A ação **Confirmar uso real** registra separadamente as formas e equipamentos informados, sem reverter o desgaste quando a peça é cancelada ou excluída. Alterações posteriores dos mesmos usos confirmados são bloqueadas. A repetição não deve duplicar registros.
- Ferramentas reutilizáveis do estoque podem ser informadas na confirmação se estiverem classificadas como ferramenta e cadastradas individualmente com uma unidade. Usos e vida útil são informados, a unidade não é baixada, e o custo estimado é contabilizado conforme custo de aquisição e vida útil. Ferramentas em lote precisam ser individualizadas para esse controle.
- Equipamentos usam o tempo informado e o custo de aquisição dividido pela vida útil em horas para estimar amortização; energia é calculada separadamente. Usos anteriores sem histórico não são inventados: o restante exibido considera apenas registros confirmados e é um limite máximo estimado.
- O preço de venda já registrado é preservado ao confirmar o uso e editar uma peça vendida. O custo de desgaste é registrado separadamente.
- O backup agora inclui equipamentos e registros de vida útil. Ao importar backup antigo que não contenha essas tabelas, preservam-se os dados existentes nelas.

## Estoque e sincronização — limites de implantação

- Uma operação de estoque gera registro local antes da chamada e marcador no commit local. A migração `20261107034548_recuperar_estoque_pendente.sql` prepara reconciliação idempotente e impede uma requisição original atrasada de ser aplicada após recuperação. Navegadores sem Web Locks não podem movimentar o estoque por este caminho.
- Se o servidor recusar uma operação por não encontrar um material recém-cadastrado, o cliente reconcilia a operação abortada, tenta sincronizar somente os cadastros necessários e repete a baixa uma vez. Erros de rede preservam a fila e o cadastro local; saldo insuficiente não aciona essa tentativa.
- A migração foi exercitada em PostgreSQL isolado por `tests/migrations/estoque-recuperacao.pglite.mjs` e aplicada ao projeto Supabase MiauDelier em 07/11/2026, com versão `20261107034548`. A função foi confirmada no catálogo: execução negada a `anon`, concedida a `authenticated`, e `search_path` fixo. O script requer PGlite externo indicado por `MIAU_PGLITE_MODULE`.
- A migração `20261107085548_impedir_estorno_duplicado.sql`, aplicada em 07/11/2026, impede recuperar a mesma operação com outro identificador de reversão. Operações anteriores à atualização são tratadas como ambíguas e exigem conciliação; não são estornadas automaticamente. A implementação foi verificada em PostgreSQL isolado e suas permissões foram conferidas no banco real.
- Não foi demonstrada concorrência real entre sessões. Se uma entrada incerta já tiver sido consumida por outra operação, a compensação pode ser recusada por saldo insuficiente; o registro permanece pendente para reconciliação, sem fabricar saldo.
- A fila foi integrada às transações das operações de negócio identificadas; em caso de falha ou rollback, dado e evento devem ser revertidos juntos. O upload trata duplicatas confirmando o conteúdo completo no servidor antes de remover o evento. Os testes cobrem transações, recuperação, backup e edição local durante download. A integração não transforma o servidor em fonte autoritativa para saldos: snapshots antigos, outros dispositivos e clientes legados ainda podem substituir saldos. Não há garantia de consistência global entre dispositivos.
- Clientes antigos não conhecem a tabela `registrosVidaUtil` e podem interromper a sincronização ao recebê-la. O cliente atualizado procura atualizações ao retornar ao aplicativo ou recuperar conexão, mas não força aplicativos antigos offline a atualizar. É necessário resolver compatibilidade e atualização de versões antes de publicar. Não promover enquanto essas condições não forem resolvidas e testadas.
- A migração adiciona uma função de recuperação ao esquema de produção; nenhum estoque, conta ou registro de usuário foi alterado nos testes isolados. O site novo ainda não foi publicado.

## Próximos passos

Concluir uma fonte de saldo autoritativa que trate todos os escritores e versões antigas, recuperação de conflitos e teste com múltiplas sessões; validar atualização dos clientes, migração, restauração e rollback em ambiente isolado equivalente ao real. Atualizar o Vault com as evidências verificadas e submeter a entrega à validação antes de qualquer promoção.
