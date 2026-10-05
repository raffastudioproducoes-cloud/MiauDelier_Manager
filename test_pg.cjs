const { Client } = require('pg');

async function test() {
  const client = new Client({
    connectionString: 'postgresql://postgres.dimjnihremxztedueoob:ao5fPMgr9QY5G2Oi@aws-0-sa-east-1.pooler.supabase.com:6543/postgres'
  });
  
  try {
    await client.connect();
    console.log("Connected to Supabase Postgres.");
    
    const res = await client.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
    `);
    
    console.log("Tables in public schema:");
    res.rows.forEach(r => console.log(" - " + r.table_name));
    
    const users = await client.query(`SELECT id, email FROM auth.users`);
    console.log("Users in auth:");
    users.rows.forEach(r => console.log(" - " + r.email));
    
  } catch(e) {
    console.error("Error:", e);
  } finally {
    await client.end();
  }
}
test();
