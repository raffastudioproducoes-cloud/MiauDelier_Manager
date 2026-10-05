const { Client } = require('pg');

async function test() {
  const client = new Client({
    connectionString: 'postgresql://postgres.dimjnihremxztedueoob:ao5fPMgr9QY5G2Oi@aws-0-sa-east-1.pooler.supabase.com:6543/postgres'
  });
  
  try {
    await client.connect();
    
    const res = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_schema = 'public' AND table_name = 'perfis';
    `);
    
    console.log("Columns in perfis:");
    res.rows.forEach(r => console.log(" - " + r.column_name + ": " + r.data_type));
    
    const count = await client.query(`SELECT COUNT(*) FROM perfis;`);
    console.log("Total perfis:", count.rows[0].count);
    
  } catch(e) {
    console.error("Error:", e);
  } finally {
    await client.end();
  }
}
test();
