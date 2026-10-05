import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://dimjnihremxztedueoob.supabase.co'
const SUPABASE_ANON_KEY = 'sb_publishable__ubqYS9Q869Z7U_I1rbVDg_mLrP_NUo'

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

async function testConnection() {
  console.log('Testing Authentication...')
  const { data, error } = await supabase.auth.signInWithPassword({
    email: 'rafacelle25@gmail.com',
    password: 'Leafar2787@'
  })

  if (error) {
    console.error('Auth Error:', error.message)
    return
  }

  console.log('Authenticated as:', data.user?.id)

  console.log('\nChecking user_keys table...')
  const { data: keys, error: keysErr } = await supabase
    .from('user_keys')
    .select('*')
    .eq('user_id', data.user?.id)

  if (keysErr) {
    console.error('user_keys Error:', keysErr.message)
  } else {
    console.log('user_keys records:', keys?.length)
  }

  console.log('\nChecking perfis table...')
  const { data: perfis, error: perfisErr } = await supabase
    .from('perfis')
    .select('*')
    .eq('user_id', data.user?.id)

  if (perfisErr) {
    console.error('perfis Error:', perfisErr.message)
  } else {
    console.log('perfis records:', perfis?.length)
  }

  if (perfis && perfis.length > 0) {
    const perfilId = perfis[0].id
    console.log('\nChecking sync_events table for perfil_id:', perfilId)
    const { data: events, error: eventsErr } = await supabase
      .from('sync_events')
      .select('id, tabela, acao')
      .eq('perfil_id', perfilId)
      .limit(5)

    if (eventsErr) {
      console.error('sync_events Error:', eventsErr.message)
    } else {
      console.log(`sync_events found: ${events?.length}`)
      if (events && events.length > 0) {
        console.log(events)
      }
    }
  }
}

testConnection()
