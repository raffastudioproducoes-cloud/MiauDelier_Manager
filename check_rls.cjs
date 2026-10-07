const { Client } = require('pg')

const connectionString = process.env.SUPABASE_DB_URL

if (!connectionString) {
  console.error('Defina SUPABASE_DB_URL para executar esta checagem.')
  process.exit(1)
}

const client = new Client({ connectionString })

async function main() {
  await client.connect()
  console.log('Connected.')

  const res = await client.query("SELECT * FROM pg_policies WHERE tablename = 'perfisAtelie'")
  console.log(JSON.stringify(res.rows, null, 2))

  await client.end()
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
