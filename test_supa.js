import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data: { user }, error: authErr } = await supabase.auth.signInWithPassword({
    email: 'rafacelle25@gmail.com',
    password: 'Leafar2787@'
  });
  
  if (authErr) {
    console.error("Auth error:", authErr);
    return;
  }
  
  console.log("Logged in:", user.id);
  
  const { data: perfis, error: perfisErr } = await supabase
    .from('perfis')
    .select('*')
    .eq('user_id', user.id);
    
  console.log("Perfis:", perfis);
  
  if (perfis && perfis.length > 0) {
    const { data: events, error: eventsErr } = await supabase
      .from('sync_events')
      .select('id, acao, tabela')
      .eq('perfil_id', perfis[0].id)
      .limit(10);
      
    console.log("Events:", events);
    
    const { count, error: countErr } = await supabase
      .from('sync_events')
      .select('id', { count: 'exact', head: true })
      .eq('perfil_id', perfis[0].id);
      
    console.log("Total events:", count);
  }
}

run();
