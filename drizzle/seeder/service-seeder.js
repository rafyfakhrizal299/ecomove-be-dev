import { db } from '../db.js'
import { users, services } from '../schema.js'
import bcrypt from 'bcrypt'
import cuid from 'cuid';
import 'dotenv/config';
import { eq } from 'drizzle-orm';

const adminEmail = 'admin@ecomove.com'

async function seed() {
  const existingServices = await db.select().from(services)

  if (existingServices.length === 0) {
    await db.insert(services).values([
      { name: 'Business Deliveries (Non-food)' },
      { name: 'Business Deliveries (Food)' },
      { name: 'Personal and Business' },
      { name: 'Personal Delivery' },
    ])
  } else {
    console.log('Services already seeded. Skipping...')
  }

  console.log('Checking for existing admin user...')
  const existingAdmin = await db
  .select()
  .from(users)
  .where(eq(users.email, adminEmail))

  if (existingAdmin.length === 0) {
    console.log('Creating admin user...')
    const hashedPassword = await bcrypt.hash('admin123', 10)

    await db.insert(users).values({
      id: cuid(),
      firstName: 'Admin',
      lastName: 'User',
      email: adminEmail,
      password: hashedPassword,
      role: 'ADMIN',
      canAccessCMS: true,
      emailVerifiedAt: new Date(),
    })

    console.log(`✅ Admin user created: ${adminEmail} / admin123`)
  } else {
    console.log(`✅ Admin already exists (${adminEmail}). Skipping...`)
  }
}

seed()
  .then(() => {
    console.log('Seeder completed.')
    process.exit(0)
  })
  .catch((err) => {
    console.error('Seeder failed:', err)
    process.exit(1)
  })