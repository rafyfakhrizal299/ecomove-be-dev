import 'dotenv/config'

/** @type {import('drizzle-kit').Config} */
export default {
  schema: './drizzle/schema.js',
  out: './drizzle/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: 'postgres://postgres:password@localhost:5433/ecomove?sslmode=disable'
  }
}