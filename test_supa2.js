const url = "https://dimjnihremxztedueoob.supabase.co/auth/v1/token?grant_type=password";
const apikey = "sb_publishable__ubqYS9Q869Z7U_I1rbVDg_mLrP_NUo";

async function run() {
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "apikey": apikey,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ email: "rafacelle25@gmail.com", password: "Leafar2787@" })
  });
  
  if (!res.ok) {
    console.error("Auth error:", await res.text());
    return;
  }
  const session = await res.json();
  console.log("User ID:", session.user.id);
  
  const token = session.access_token;
  
  const perfisRes = await fetch("https://dimjnihremxztedueoob.supabase.co/rest/v1/perfis?select=*", {
    headers: {
      "apikey": apikey,
      "Authorization": "Bearer " + token
    }
  });
  const perfis = await perfisRes.json();
  console.log("Perfis:", perfis);
  
  if (perfis && perfis.length > 0) {
    const eventsRes = await fetch(`https://dimjnihremxztedueoob.supabase.co/rest/v1/sync_events?select=id,tabela,acao&perfil_id=eq.${perfis[0].id}`, {
      headers: {
        "apikey": apikey,
        "Authorization": "Bearer " + token
      }
    });
    const events = await eventsRes.json();
    console.log("Total events in DB:", events.length);
    console.log("Some events:", events.slice(0, 5));
  }
}
run();
