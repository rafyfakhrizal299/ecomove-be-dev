import { Client } from 'pg';
import 'dotenv/config';

const client = new Client({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:usFljNlugnZCbXkdnUCHPDjOsjmeYvOB@shortline.proxy.rlwy.net:45096/railway'
});

await client.connect();

await client.query(`
  DO $$ DECLARE
    r RECORD;
  BEGIN
    FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') LOOP
      EXECUTE 'DROP TABLE IF EXISTS "' || r.tablename || '" CASCADE';
    END LOOP;
  END $$;
`);

await client.end();
console.log('✅ Semua tabel dihapus.');