-- O aplicativo nao usa mais DEK local nem chaves envelopadas.
-- A protecao da conta fica no Supabase Auth, RLS e HTTPS.
DROP TABLE IF EXISTS public.user_keys;
