const supabaseUrl = 'https://dimjnihremxztedueoob.supabase.co';
const anonKey = 'sb_publishable__ubqYS9Q869Z7U_I1rbVDg_mLrP_NUo';

async function test() {
    console.log('Logging in...');
    const authRes = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
        method: 'POST',
        headers: {
            'apikey': anonKey,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            email: 'test@example.com',
            password: 'password123'
        })
    });
    
    if (!authRes.ok) {
        console.error('Login failed', await authRes.text());
        return;
    }
    
    const authData = await authRes.json();
    console.log('Logged in as', authData.user.id);
    
    const token = authData.access_token;
    
    console.log('Testing insert into perfis...');
    const insertRes = await fetch(`${supabaseUrl}/rest/v1/perfis`, {
        method: 'POST',
        headers: {
            'apikey': anonKey,
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=representation'
        },
        body: JSON.stringify({
            user_id: authData.user.id,
            nome: 'Test Perfil REST'
        })
    });
    
    if (!insertRes.ok) {
        console.error('Insert failed', await insertRes.text());
    } else {
        console.log('Insert success', await insertRes.json());
    }
}

test().catch(console.error);
