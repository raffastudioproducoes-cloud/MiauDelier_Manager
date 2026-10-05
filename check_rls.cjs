const { Client } = require('pg');

const client = new Client({ 
    connectionString: 'postgresql://postgres.dimjnihremxztedueoob:ao5fPMgr9QY5G2Oi@aws-0-sa-east-1.pooler.supabase.com:6543/postgres' 
});

async function main() {
    await client.connect();
    console.log('Connected.');
    
    const res = await client.query("SELECT * FROM pg_policies WHERE tablename = 'perfisAtelie'");
    console.log(JSON.stringify(res.rows, null, 2));
    
    await client.end();
}

main().catch(console.error);
