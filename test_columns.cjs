const supabaseUrl = 'https://dimjnihremxztedueoob.supabase.co';
const anonKey = 'sb_publishable__ubqYS9Q869Z7U_I1rbVDg_mLrP_NUo';

async function test() {
    console.log('Testing column existence via GET request');
    const res = await fetch(`${supabaseUrl}/rest/v1/perfis?select=id,nome,nome_dono,email_dono,documento,telefone,endereco,updated_at&limit=1`, {
        headers: {
            'apikey': anonKey
        }
    });
    
    if (!res.ok) {
        console.error('Request failed:', res.status, res.statusText);
        console.error(await res.text());
    } else {
        console.log('Success!', await res.json());
    }
}

test().catch(console.error);
