# Correção dos testes no GitHub Actions

Em 05/11/2026, sete testes de sincronização, dashboard, pedidos e precificação
falhavam porque criavam registros sem perfil de estoque sincronizado. Esses
testes passaram a simular a transação de estoque para verificar suas próprias
funcionalidades; os testes específicos da integração continuam separados.
Essa simulação não valida a comunicação com o Supabase real.

Validação local: 372 testes em 79 arquivos, lint e TypeScript passaram.
