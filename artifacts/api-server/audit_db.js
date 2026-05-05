import pkg from 'pg';
const { Client } = pkg;

const client = new Client({
  connectionString: "postgresql://postgres.dbwcgbnowoabwkztfmqi:22BsT!025!kd@aws-1-ap-northeast-1.pooler.supabase.com:5432/postgres"
});

async function audit() {
  await client.connect();
  const res = await client.query(`
    SELECT column_name, data_type 
    FROM information_schema.columns 
    WHERE table_name = 'venues'
  `);
  console.log("VENUES COLUMNS:", res.rows);
  
  const users = await client.query(`
    SELECT column_name, data_type 
    FROM information_schema.columns 
    WHERE table_name = 'users'
  `);
  console.log("USERS COLUMNS:", users.rows);

  await client.end();
}

audit().catch(console.error);
