import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.production' });

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function main() {
    console.log('Logging in...');
    // I know this test user worked before
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: 'test@example.com',
        password: 'password123'
    });

    if (authError) {
        console.error('Login error:', authError);
        return;
    }
    
    console.log('Logged in as:', authData.user.id);
    
    console.log('Inserting into perfisAtelie...');
    const { data: insertData, error: insertError } = await supabase.from('perfisAtelie').insert([{
        perfil_id: 'test-perfil-123',
        nome: 'Test Perfil',
        user_id: authData.user.id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
    }]);

    if (insertError) {
        console.error('Insert error:', insertError);
    } else {
        console.log('Insert success:', insertData);
    }
    
    console.log('Selecting from perfisAtelie...');
    const { data: selectData, error: selectError } = await supabase.from('perfisAtelie').select('*');
    if (selectError) {
        console.error('Select error:', selectError);
    } else {
        console.log('Select success:', selectData);
    }
}

main().catch(console.error);
