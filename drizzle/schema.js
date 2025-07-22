import { pgTable, varchar, boolean, timestamp, text, integer, pgEnum, serial } from 'drizzle-orm/pg-core'

export const roleEnum = pgEnum('Role', ['ADMIN', 'USER'])

export const services = pgTable('Service', {
  id: serial('id').primaryKey().notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  createdAt: timestamp('createdAt', { mode: 'date' }).defaultNow(),
  updatedAt: timestamp('updatedAt', { mode: 'date' }).defaultNow(),
})

export const users = pgTable('User', {
  id: varchar('id', { length: 255 }).primaryKey().notNull(),
  firstName: varchar('firstName', { length: 255 }).notNull(),
  lastName: varchar('lastName', { length: 255 }).notNull(),
  mobileNumber: varchar('mobileNumber', { length: 20 }),
  email: varchar('email', { length: 255 }).unique(),
  password: varchar('password', { length: 255 }),
  provider: varchar('provider', { length: 100 }),
  providerId: varchar('providerId', { length: 255 }),
  emailVerifiedAt: timestamp('emailVerifiedAt', { mode: 'date' }),
  role: roleEnum('role').default('USER').notNull(),
  canAccessCMS: boolean('canAccessCMS').default(false).notNull(),
  serviceId: integer('serviceId'),
  createdAt: timestamp('createdAt', { mode: 'date' }).defaultNow(),
  updatedAt: timestamp('updatedAt', { mode: 'date' }).defaultNow(),
})