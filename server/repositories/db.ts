import pg from 'pg';

const { Pool } = pg;

if (!process.env.SUPABASE_DB_PASSWORD) {
  throw new Error('SUPABASE_DB_PASSWORD is missing');
}

export const pool = new Pool({
  host: 'aws-1-us-west-2.pooler.supabase.com',
  port: 5432,
  user: 'postgres.iprsieropzcwutcmdphu',
  password: process.env.SUPABASE_DB_PASSWORD,
  database: 'postgres',
  ssl: {
    rejectUnauthorized: false,
  },
});

export async function testDbConnection() {
  const client = await pool.connect();

  try {
    const result = await client.query(
      'select current_database(), current_user, now()',
    );
    console.log('DB test result:', result.rows[0]);
  } finally {
    client.release();
  }
}
