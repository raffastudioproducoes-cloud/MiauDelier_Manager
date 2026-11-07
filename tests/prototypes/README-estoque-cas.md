# Experimento isolado: revisão de materiais

Os arquivos `estoque-cas-experimental.sql` e `estoque-cas-experimental.mjs` são um protótipo local em PGlite, **não são migração e não devem ser aplicados em produção**.

O experimento adiciona `revisao_base` ao modelo simulado e exige que atualizações de um material apontem para o último evento conhecido. Gravações antigas sem revisão e versões desatualizadas são rejeitadas com erro, em vez de substituir saldo ou metadados silenciosamente. Saldo só pode divergir na função de estoque existente; a identidade do usuário e do perfil continua sendo verificada. A ordenação de eventos é atribuída sob uma trava por perfil no banco simulado.

Para executar, com PGlite instalado fora do projeto:

```bash
MIAU_PGLITE_MODULE=file:///caminho/pglite/dist/index.js node tests/prototypes/estoque-cas-experimental.mjs
```

O teste cobre criação, repetição de UUID, rejeição de payload diferente, revisão ausente/obsoleta, saldo divergente, autorização por perfil, baixa pela RPC, rejeição de exclusão e ordem atribuída pelo servidor.

Antes de qualquer migração real é necessário adaptar a sincronização para obter e enviar revisões, definir contratos de criação e exclusão, conciliá-los com compras, importação e backup, prover tratamento explícito de clientes antigos sem perder operações pendentes e testar PostgreSQL real com sessões concorrentes e RLS real. Há também necessidade de tratar eventos históricos com timestamp futuro e cursores já existentes. O experimento não cobre isso nem demonstra compatibilidade com o aplicativo atual.
