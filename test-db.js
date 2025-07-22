import pkg from 'pg';
import 'dotenv/config';
const { Client } = pkg;

const client = new Client({
  connectionString: process.env.DATABASE_URL, // atau masukkan manual di sini kalau belum pakai .env
  // contoh langsung:
  // connectionString: 'postgres://postgres:your_password@localhost:5433/postgres',
});

async function testConnection() {
  try {
    await client.connect();
    const res = await client.query('SELECT NOW()');
    console.log('🟢 Connected to DB. Time:', res.rows[0]);
  } catch (err) {
    console.error('🔴 Connection error:', err);
  } finally {
    await client.end();
  }
}

testConnection();