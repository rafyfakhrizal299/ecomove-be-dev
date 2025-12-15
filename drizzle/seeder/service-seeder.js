import { db } from '../db.js'
import { users, services, deliveryRates } from '../schema.js' // pastiin deliveryRates ada di schema
import bcrypt from 'bcrypt'
import cuid from 'cuid';
import 'dotenv/config';
import { eq } from 'drizzle-orm';

const adminEmail = 'admin@ecomove.com'

async function seed() {
  // --- Services ---
  const existingServices = await db.select().from(services)

  if (existingServices.length === 0) {
    await db.insert(services).values([
      { name: 'Business Deliveries (Non-food)' },
      { name: 'Business Deliveries (Food)' },
      { name: 'Personal and Business' },
      { name: 'Personal Delivery' },
    ])
    console.log('✅ Services seeded.')
  } else {
    console.log('Services already seeded. Skipping...')
  }

  // --- Admin User ---
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

  // --- Delivery Rates ---
  // const existingRates = await db.select().from(deliveryRates)

  // if (existingRates.length === 0) {
  //   const deliveryRatesData = [
  //     { deliveryType: "same-day", packageSize: "small", minDistance: 0, maxDistance: 5000, price: 150 },
  //     { deliveryType: "same-day", packageSize: "small", minDistance: 5001, maxDistance: 10000, price: 180 },
  //     { deliveryType: "same-day", packageSize: "small", minDistance: 10001, maxDistance: null, price: 210 },

  //     { deliveryType: "same-day", packageSize: "large", minDistance: 0, maxDistance: 5000, price: 190 },
  //     { deliveryType: "same-day", packageSize: "large", minDistance: 5001, maxDistance: 10000, price: 220 },
  //     { deliveryType: "same-day", packageSize: "large", minDistance: 10001, maxDistance: null, price: 250 },

  //     { deliveryType: "standard", packageSize: "small", minDistance: 0, maxDistance: 5000, price: 120 },
  //     { deliveryType: "standard", packageSize: "small", minDistance: 5001, maxDistance: 10000, price: 150 },
  //     { deliveryType: "standard", packageSize: "small", minDistance: 10001, maxDistance: null, price: 180 },

  //     { deliveryType: "standard", packageSize: "large", minDistance: 0, maxDistance: 5000, price: 150 },
  //     { deliveryType: "standard", packageSize: "large", minDistance: 5001, maxDistance: 10000, price: 180 },
  //     { deliveryType: "standard", packageSize: "large", minDistance: 10001, maxDistance: null, price: 210 }
  //   ]

  //   await db.insert(deliveryRates).values(
  //     deliveryRatesData.map(rate => ({
  //       deliveryType: rate.deliveryType,
  //       packageSize: rate.packageSize,
  //       minDistance: rate.minDistance,
  //       maxDistance: rate.maxDistance,
  //       price: rate.price
  //     }))
  //   )
  //   console.log('✅ Delivery rates seeded.')
  // } else {
  //   console.log('Delivery rates already seeded. Skipping...')
  // }
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
