import pg from 'pg';
const { Client } = pg;

async function main() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });
  await client.connect();
  
  console.log('--- Columns in users table ---');
  const columns = await client.query(`
    SELECT column_name, data_type 
    FROM information_schema.columns 
    WHERE table_name = 'users';
  `);
  console.table(columns.rows);

  console.log('--- Triggers on users table ---');
  const triggers = await client.query(`
    SELECT trigger_name 
    FROM information_schema.triggers 
    WHERE event_object_table = 'users';
  `);
  console.table(triggers.rows);

  await client.end();
}

main().catch(console.error);
