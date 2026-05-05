import pg from 'pg';
const { Client } = pg;

async function main() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });
  await client.connect();
  
  console.log('AUDIT START');
  
  // Get all tables
  const tables = await client.query(`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public';
  `);
  
  for (const row of tables.rows) {
    const tableName = row.table_name;
    console.log(`\n--- TABLE: ${tableName} ---`);
    
    // Get columns
    const columns = await client.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = $1
      ORDER BY ordinal_position;
    `, [tableName]);
    console.table(columns.rows);
    
    // Get triggers
    const triggers = await client.query(`
      SELECT trigger_name 
      FROM information_schema.triggers 
      WHERE event_object_table = $1;
    `, [tableName]);
    if (triggers.rows.length > 0) {
      console.log('Triggers:');
      console.table(triggers.rows);
    }
  }
  
  console.log('\nAUDIT END');
  await client.end();
}

main().catch(console.error);
