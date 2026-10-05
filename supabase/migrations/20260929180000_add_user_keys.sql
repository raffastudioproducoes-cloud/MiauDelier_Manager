-- Criação da tabela para armazenar as chaves de recuperação criptografadas
CREATE TABLE IF NOT EXISTS public.user_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    wrapped_dek TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    UNIQUE(user_id)
);

-- Ativar RLS
ALTER TABLE public.user_keys ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE policyname = 'Usuários podem ver suas próprias chaves' AND tablename = 'user_keys'
    ) THEN
        CREATE POLICY "Usuários podem ver suas próprias chaves" 
            ON public.user_keys FOR SELECT 
            USING (auth.uid() = user_id);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE policyname = 'Usuários podem inserir suas próprias chaves' AND tablename = 'user_keys'
    ) THEN
        CREATE POLICY "Usuários podem inserir suas próprias chaves" 
            ON public.user_keys FOR INSERT 
            WITH CHECK (auth.uid() = user_id);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE policyname = 'Usuários podem atualizar suas próprias chaves' AND tablename = 'user_keys'
    ) THEN
        CREATE POLICY "Usuários podem atualizar suas próprias chaves" 
            ON public.user_keys FOR UPDATE 
            USING (auth.uid() = user_id) 
            WITH CHECK (auth.uid() = user_id);
    END IF;
END $$;
