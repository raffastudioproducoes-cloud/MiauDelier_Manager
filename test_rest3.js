const supabaseUrl = 'https://dimjnihremxztedueoob.supabase.co';
const anonKey = 'sb_publishable__ubqYS9Q869Z7U_I1rbVDg_mLrP_NUo';

async function test() {
    console.log('Signing up...');
    const authRes = await fetch(`${supabaseUrl}/auth/v1/signup`, {
        method: 'POST',
        headers: {
            'apikey': anonKey,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            email: 'test' + Date.now() + '@example.com',
            password: 'password123'
        })
    });
    
    if (!authRes.ok) {
        console.error('Signup failed', await authRes.text());
        return;
    }
    
    const authData = await authRes.json();
    console.log('Signed up as', authData.user.id);
    
    // Check if email confirmation is required by seeing if we got a token
    let token = authData.session?.access_token;
    
    if (!token) {
        console.log('No token obtained, probably email confirmation required.');
        return;
    }
    
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
