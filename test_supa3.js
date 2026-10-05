const url = 'https://dimjnihremxztedueoob.supabase.co/auth/v1/signup';
const apikey = 'sb_publishable__ubqYS9Q869Z7U_I1rbVDg_mLrP_NUo';
async function run() {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'apikey': apikey, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'test_miau_999@example.com', password: 'Password123!' })
  });
  const data = await res.json();
  console.log('Signup:', data);
  if (!data.access_token) return;
  const insert = await fetch('https://dimjnihremxztedueoob.supabase.co/rest/v1/perfis', {
    method: 'POST',
    headers: { 'apikey': apikey, 'Authorization': 'Bearer ' + data.access_token, 'Content-Type': 'application/json', 'Prefer': 'return=representation' },
    body: JSON.stringify({ user_id: data.user.id, nome: 'Test Atelie' })
  });
  console.log('Insert Status:', insert.status);
  console.log('Insert result:', await insert.text());
}
run();
