import { db } from '../db.js'
import { user, service } from '../schema.js'
import bcrypt from 'bcrypt'
import cuid from 'cuid'

const adminEmail = 'admin@ecomove.com'

async function seed() {
  const existingServices = await db.select().from(service)

  if (existingServices.length === 0) {
    console.log('🌱 Seeding services...')
    await db.insert(service).values([
      { name: 'Business Deliveries (Non-food)' },
      { name: 'Business Deliveries (Food)' },
      { name: 'Personal and Business' },
      { name: 'Personal Delivery' },
    ])
  } else {
    console.log('✅ Services already seeded. Skipping...')
  }

  const existingAdmin = await db
    .select()
    .from(user)
    .where(user.email.eq(adminEmail))

  if (existingAdmin.length === 0) {
    const hashedPassword = await bcrypt.hash('admin123', 10)

    await db.insert(user).values({
      id: cuid(),
      firstName: 'Admin',
      lastName: 'User',
      email: adminEmail,
      password: hashedPassword,
      role: 'ADMIN',
      canAccessCMS: true,
      emailVerifiedAt: new Date(),
    })

  } else {
  }
}

seed()
  .then(() => {
    console.log('🎉 Seeder completed.')
    process.exit(0)
  })
  .catch((err) => {
    console.error('❌ Seeder failed:', err)
    process.exit(1)
  })